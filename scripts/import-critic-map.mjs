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

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status >= 500) {
        await sleep(5000 * (i + 1));
        continue;
      }
      return r.ok ? await r.json() : null;
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

/** Does a geocoder's address agree with the place's city / state / postcode? */
const sameArea = (addr, want) => {
  const have = fold(Object.values(addr || {}).join(' | '));
  return [want.postcode, want.city, want.state].filter(Boolean).some((w) => have.includes(fold(w).replace(/^heroica /, '').replace(/\.$/, '')));
};

/** Nominatim (free-form or structured), kept only when it lands in the right city. */
async function nominatim(params, want) {
  const qs = typeof params === 'string' ? `q=${encodeURIComponent(params)}` : new URLSearchParams(params).toString();
  const j = await getJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=mx&accept-language=es&${qs}`);
  await sleep(1100);
  const hit = (j || []).find((x) => !want || sameArea(x.address, want));
  return hit ? { lat: +hit.lat, lon: +hit.lon } : null;
}

/** Photon (OpenStreetMap search, good at business names) — a café or shop of that name in that city. */
async function photon(name, want) {
  const j = await getJson(`https://photon.komoot.io/api/?limit=5&lang=default&q=${encodeURIComponent([name, want.city, want.state, 'México'].filter(Boolean).join(', '))}`);
  await sleep(600);
  const w = words(name);
  const hit = (j?.features || []).find((f) => {
    const pr = f.properties || {};
    return pr.countrycode === 'MX' && w && words(pr.name || '').includes(w.split(' ')[0]) && sameArea({ c: pr.city, s: pr.state, p: pr.postcode, d: pr.district, l: pr.locality }, want);
  });
  return hit ? { lat: hit.geometry.coordinates[1], lon: hit.geometry.coordinates[0] } : null;
}

/** Locate a place: its address, then the street alone, then its name, then its colonia (approximate). */
async function locate(name, full, cityHint) {
  const pa = partsOf(full, cityHint);
  const postcode = (/\b(\d{5})\b/.exec(full) || [])[1] || '';
  const want = { city: pa.city || cityHint, state: pa.state, postcode };
  const street = String(full).split(',')[0].replace(/-?\s*(local|loc|int|interior)\b.*$/i, '').trim();
  const tries = [
    ['address', () => (full ? nominatim(cleanAddr(full), want) : null)],
    ['address', () => (street && /\d/.test(street) ? nominatim({ street, city: want.city || '', state: want.state || '', ...(postcode ? { postalcode: postcode } : {}) }, want) : null)],
    ['name', () => photon(name, want)],
    ['name', () => nominatim([name, want.city, want.state].filter(Boolean).join(', '), want)],
    ['area', () => (pa.hood ? nominatim([pa.hood, postcode, want.city, want.state].filter(Boolean).join(', '), want) : null)],
  ];
  for (const [precision, run] of tries) {
    const g = await run();
    if (g) return { lat: +g.lat.toFixed(6), lon: +g.lon.toFixed(6), precision, v: 2 };
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
    if (lat == null && geo[key]?.lat != null) ({ lat, lon, precision } = geo[key]);
    // look up what isn't known yet; earlier misses get one more go with every strategy
    const missed = geo[key] === null || geo[key]?.miss === 1 || (geo[key]?.precision === 'name' && !geo[key].v);
    if (missed && geo[key]?.lat != null) lat = lon = precision = null;
    if (lat == null && (geo[key] === undefined || missed) && Date.now() - t0 < BUDGET_MS) {
      looked++;
      const g = await locate(p.name, full, d.Address);
      geo[key] = g || { miss: 2 };
      if (g) (lat = g.lat), (lon = g.lon), (precision = g.precision), found++;
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
