#!/usr/bin/env node
/**
 * Import a house critic's Google My Maps map into their critic list.
 *
 * Reads the map's own KML export (fetched by .github/workflows/import-critic-map.yml),
 * and for every place keeps what the map says — name, address, the critic's
 * description, social link, Google place id — adding:
 *  - coordinates: the map's own pin when it has one, else the address geocoded
 *    with OpenStreetMap Nominatim (1 request/s, cached by Google place id in
 *    src/data/critics/<id>.geo.json so a re-run only looks up new places);
 *  - colonia and city, read from the address;
 *  - a link to the guide's page when the place is already in the guide (same
 *    name, within 250 m).
 * Output: the critic's `list` (and `maps`) in src/data/critics/<id>.json.
 *
 *   node scripts/import-critic-map.mjs tametitoeats <kml> <map url>
 */
import fs from 'node:fs';
import { fold } from './lib/relevance.mjs';

const [, , ID = 'tametitoeats', KML = `src/data/critics/${ID}.map.kml`, MAP_URL = ''] = process.argv;
const OUT = `src/data/critics/${ID}.json`;
const GEO = `src/data/critics/${ID}.geo.json`;
const UA = 'CRTQ-critic-map/1.0 (https://github.com/juanctame/NMC-)';
const BUDGET_MS = Number(process.env.GEO_BUDGET_S || 1500) * 1000;
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const unxml = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
const tag = (block, name) => unxml((new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block) || [])[1]);

function parseKml(xml) {
  const doc = tag(xml, 'name');
  const folder = (/<Folder>\s*<name>([\s\S]*?)<\/name>/.exec(xml) || [])[1];
  const out = [];
  for (const m of xml.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
    const b = m[1];
    const data = {};
    for (const d of b.matchAll(/<Data name="([^"]+)">\s*<value(?:\s*\/>|>([\s\S]*?)<\/value>)/g)) data[d[1]] = unxml(d[2] || '');
    const pt = /<Point>[\s\S]*?<coordinates>\s*([-\d.]+),([-\d.]+)/.exec(b);
    out.push({ name: tag(b, 'name'), data, lat: pt ? +pt[2] : null, lon: pt ? +pt[1] : null });
  }
  return { title: doc, folder: unxml(folder || ''), places: out };
}

const ALCALDIAS = /^(alvaro obregon|azcapotzalco|benito juarez|coyoacan|cuajimalpa( de morelos)?|cuauhtemoc|gustavo a\.? madero|iztacalco|iztapalapa|la magdalena contreras|magdalena contreras|miguel hidalgo|milpa alta|tlahuac|tlalpan|venustiano carranza|xochimilco)$/;
const tidyHood = (h) =>
  String(h || '')
    .replace(/^(colonia|col\.?|fracc\.?|fraccionamiento|barrio)\s+/i, '')
    .replace(/\bNte\.?(?=$|\s)/g, 'Norte')
    .replace(/\bSur\.?(?=$|\s)/g, 'Sur')
    .replace(/\bPte\.?(?=$|\s)/g, 'Poniente')
    .replace(/\bOte\.?(?=$|\s)/g, 'Oriente')
    .replace(/\bSecc\b\.?/g, 'Secc.')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

/**
 * Google-style Mexican addresses: "Calle 1, Colonia, [Alcaldía,] 06700 Ciudad, Estado, Mexico"
 * → { hood, borough, city, state }
 */
function partsOf(full, cityHint) {
  const p = String(full || '').split(',').map((s) => s.trim()).filter(Boolean);
  const i = p.findIndex((s) => /^\d{5}\b/.test(s));
  if (i < 0) return { hood: '', borough: '', city: cityHint || '', state: '' };
  const city = p[i].replace(/^\d{5}\s*/, '') || cityHint || '';
  const state = (p[i + 1] || '').replace(/\.$/, '');
  let k = i - 1, borough = '';
  if (k >= 1 && ALCALDIAS.test(fold(p[k]))) (borough = p[k]), k--;
  let hood = k >= 1 ? p[k] : '';
  // "Colonia Centro, Centro" / "Polanco, Polanco I Secc" — the plainer name reads better
  if (k >= 2 && fold(tidyHood(p[k - 1])) && fold(p[k]).startsWith(fold(tidyHood(p[k - 1])))) hood = p[k - 1];
  if (/^(c\.|calle|av\.?|avenida|blvd|calz|carr|priv\.?|\d)/i.test(hood) || /\d{2,}/.test(hood)) hood = '';
  return { hood: tidyHood(hood), borough, city, state };
}

const handleOf = (s) => {
  const v = String(s || '').trim();
  let m;
  if ((m = /instagram\.com\/([A-Za-z0-9._]+)\/?(?:$|\?)/.exec(v))) return '@' + m[1];
  if (/^https?:/.test(v)) return '';
  if ((m = /^@?([A-Za-z0-9._]{2,30})$/.exec(v))) return '@' + m[1];
  return '';
};
const linkOf = (s) => (/^https?:\/\//.test(String(s || '').trim()) ? String(s).trim() : '');

async function nominatim(q) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&accept-language=es&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 429 || r.status >= 500) {
        await sleep(5000 * (i + 1));
        continue;
      }
      if (!r.ok) return null;
      const j = await r.json();
      return j[0] ? { lat: +j[0].lat, lon: +j[0].lon, kind: j[0].addresstype || j[0].type } : null;
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

/** The address without the house number noise Nominatim chokes on ("Local 3", "Int. 2"). */
const cleanAddr = (a) =>
  String(a || '')
    .replace(/\b(local|loc\.?|int\.?|interior|piso|depto\.?|despacho|planta baja|pb)\s*[\w-]*\s*,?/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .trim();

function readVenues() {
  const t = fs.readFileSync('src/data/carte.ts', 'utf8');
  const a = t.indexOf('= [', t.indexOf('const RAW')) + 2;
  return JSON.parse(t.slice(a, t.indexOf('\n];', a) + 2));
}
const words = (s) => fold(s).replace(/\b(cafe|cafeteria|coffee|roasters?|shop|bar|the|el|la|los|las|de|del)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const dist = (a, b) => {
  const R = 6371000, r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * R;
};

async function main() {
  if (!fs.existsSync(KML)) return console.log(`no ${KML} — nothing to import`);
  const xml = fs.readFileSync(KML, 'utf8');
  if (!/<kml/.test(xml)) return console.log(`${KML} is not KML (the map may be private) — keeping the current list`);
  const map = parseKml(xml);
  const geo = fs.existsSync(GEO) ? JSON.parse(fs.readFileSync(GEO, 'utf8')) : {};
  const venues = readVenues().filter((v) => v.lat && v.lon);
  let looked = 0, found = 0;

  const list = [];
  for (const p of map.places) {
    const d = p.data;
    const gid = d.Gid || '';
    const full = d['Full address'] || '';
    const key = gid || fold(p.name + ' ' + full);
    let lat = p.lat, lon = p.lon, precision = lat != null ? 'pin' : null;
    if (lat == null && geo[key]) ({ lat, lon, precision } = geo[key]);
    if (lat == null && geo[key] === undefined && Date.now() - t0 < BUDGET_MS) {
      // the full street address first, then the name in its city
      let g = full ? await nominatim(cleanAddr(full)) : null;
      await sleep(1100);
      looked++;
      let prec = 'address';
      if (!g) {
        const { city, state } = partsOf(full, d.Address);
        g = await nominatim([p.name, city || d.Address, state].filter(Boolean).join(', '));
        await sleep(1100);
        prec = 'name';
      }
      geo[key] = g ? { lat: +g.lat.toFixed(6), lon: +g.lon.toFixed(6), precision: prec } : null;
      if (g) ({ lat, lon, precision } = geo[key]), found++;
    }
    const { hood, borough, city, state } = partsOf(full, d.Address);
    const e = {
      id: `${ID}-${gid || fold(p.name).replace(/[^a-z0-9]+/g, '-')}`,
      name: p.name,
      list: 'map',
      kind: 'Coffee shop',
      ...(hood ? { hood } : {}),
      ...(borough ? { borough } : {}),
      city: city || d.Address || '',
      ...(state ? { state } : {}),
      ...(full ? { address: full } : {}),
      ...(lat != null ? { lat, lon, precision } : {}),
      ...(gid ? { gid } : {}),
      ...(handleOf(d['Social media']) ? { instagram: handleOf(d['Social media']) } : {}),
      ...(linkOf(d.Url || d['Social media']) ? { link: linkOf(d.Url || d['Social media']) } : {}),
      ...(d.Description && d.Description.replace(/[.\s]/g, '') ? { note: d.Description.trim() } : {}),
      ...(d.Status && d.Status !== 'candidate' ? { status: d.Status } : {}),
    };
    // already in the guide? same name, a short walk away
    if (lat != null) {
      const w = words(p.name);
      const v = venues.find((v) => w && words(v.name) === w && dist({ lat, lon }, v) < 250);
      if (v) e.placeId = v.id;
    }
    list.push(e);
  }
  fs.writeFileSync(GEO, JSON.stringify(geo, null, 0) + '\n');

  const critic = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  critic.maps = [{ title: map.title || 'Map', folder: map.folder || '', url: MAP_URL, count: list.length, source: 'Google My Maps' }];
  // keep scored entries (Beli etc.) and replace the map's
  critic.list = [...(critic.list || []).filter((e) => e.list !== 'map'), ...list];
  critic.asOf = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUT, JSON.stringify(critic, null, 1) + '\n');
  const located = list.filter((e) => e.lat != null).length;
  console.log(`${map.title} / ${map.folder}: ${list.length} places, ${located} located (${looked} geocoded now, ${found} found), ${list.filter((e) => e.placeId).length} in the guide`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
