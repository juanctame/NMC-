#!/usr/bin/env node
/**
 * Spot discovery — always finding new places to eat in Mexico City.
 *
 * The Discover spots workflow (.github/workflows/discover.yml) sweeps the
 * whole city for places to eat and drink and works out which ones are NEW, which are TALKED ABOUT, and
 * which diners TOLD US about:
 *
 *  1. OpenStreetMap (Overpass): every named restaurant, café, bar, taquería
 *     stall, bakery… with whatever the map knows (cuisine, hours, website,
 *     Instagram, a photo). Swept in tiles, across mirrors, with retries.
 *  2. A ledger of every spot we've ever seen and the day we first saw it,
 *     carried from one deploy to the next (published with the site). A spot
 *     that appears after the first sweep is new to the city's map. Spots added
 *     to OSM in the last months (first version, recent edit) and spots with a
 *     recent opening date count as new from day one.
 *  3. The press: recent headlines from Google News searches about openings in
 *     CDMX; a spot (or a guide restaurant) named in a headline gets "buzz",
 *     with the article linked.
 *  4. Diners: spots people suggested in the app (Supabase spot_suggestions).
 *  5. Pictures: the photo OSM links (image / Wikimedia Commons), else the
 *     preview image of the spot's own website — a rotating budget per run, the
 *     results remembered across runs.
 *
 * Writes to OUT_DIR (default dist/data), published with the site:
 *   spots-index.json   counts, sources, when, which tiles exist
 *   spots/<tile>.json  every spot, by 0.05° tile (the map / nearby)
 *   spots-new.json     the discovery pool: new, buzzing, suggested, and
 *                      independent spots with enough detail to recommend
 *   spots-ledger.json  id → first seen (the memory between runs)
 *   spots-media.json   id → photo (the memory of found pictures)
 *   news.json          recent food headlines matched to spots
 * The app reads these fresh on every launch (src/data/spots.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fold, words } from './lib/relevance.mjs';

const OUT = process.env.OUT_DIR || 'dist/data';
const SITE = (process.env.SITE_URL || 'https://juanctame.github.io/NMC-/').replace(/\/?$/, '/');
const SWEEP_HOURS = Number(process.env.SWEEP_HOURS || 20);
const FORCE = !!process.env.FORCE;
const PHOTO_BUDGET = Number(process.env.PHOTO_BUDGET || 160);
const UA = 'CRTQ-Discovery/1.1 (+https://juanctame.github.io/NMC-/; food discovery for Mexico City)';
const CITY = { id: 'cdmx', bbox: [19.18, -99.36, 19.6, -98.94] }; // s, w, n, e
const TILE = 0.05;
const DAY = 864e5;
// Time budget: discovery must never hold up a deploy. The sweep stops taking
// new tiles after OSM_BUDGET, picture lookups stop after PHOTO_DEADLINE; what
// was found by then is published.
const START = Date.now();
const OSM_BUDGET = Number(process.env.OSM_BUDGET_MIN || 14) * 6e4;
const PHOTO_DEADLINE = Number(process.env.TOTAL_BUDGET_MIN || 19) * 6e4;
const timeLeft = (budget) => budget - (Date.now() - START);
const today = () => new Date().toISOString().slice(0, 10);

export const OVERPASS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const GRID = Number(process.env.GRID || 5); // 5×5 tiles: small enough for the dense centre

const NEWS_QUERIES = [
  'nuevo restaurante CDMX',
  'apertura restaurante Ciudad de México',
  'nueva taquería CDMX',
  'nueva cafetería CDMX',
  'nuevo bar CDMX',
  'abre restaurante Roma Condesa',
  'restaurantes nuevos Ciudad de México',
  'new restaurant Mexico City',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, init = {}, ms = 20000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { redirect: 'follow', signal: ctl.signal, ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(to);
  }
}

// ── 1. OpenStreetMap ────────────────────────────────────────────────────────

export function tiles(bbox, n = GRID) {
  const [s, w, nn, e] = bbox;
  const out = [];
  const dl = (nn - s) / n;
  const dw = (e - w) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([s + i * dl, w + j * dw, s + (i + 1) * dl, w + (j + 1) * dw].map((x) => +x.toFixed(5)));
  return out;
}

export function overpassQuery(b) {
  const bb = b.join(',');
  return (
    `[out:json][timeout:${Math.max(60, Number(process.env.OVERPASS_TIMEOUT_S || 75) - 10)}];(` +
    `nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|biergarten)$"]["name"](${bb});` +
    `nwr["shop"~"^(bakery|pastry|coffee|deli|confectionery|tortilla)$"]["name"](${bb});` +
    `);out center meta;`
  );
}

async function overpass(query, label) {
  const dead = new Set(); // mirrors that refused this run's requests outright
  for (let attempt = 0; attempt < 6; attempt++) {
    if (timeLeft(OSM_BUDGET) < 20000) {
      console.log(`  ${label}: out of time for the sweep`);
      return null;
    }
    const live = OVERPASS.filter((e) => !dead.has(e));
    if (!live.length) return null;
    const ep = live[attempt % live.length];
    const host = ep.split('/')[2];
    const ms = Math.min(Number(process.env.OVERPASS_TIMEOUT_S || 90) * 1000, timeLeft(OSM_BUDGET));
    try {
      let r = await get(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }, ms);
      // Some instances refuse POST forms (406): the same query as a GET.
      if (r.status === 406) r = await get(`${ep}?data=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } }, ms);
      if (r.ok) {
        const d = await r.json().catch(() => null);
        if (Array.isArray(d?.elements)) return d.elements;
      }
      console.log(`  ${label}: ${host} → HTTP ${r.status}`);
      if (r.status === 406 || r.status === 403) dead.add(ep);
    } catch (e) {
      console.log(`  ${label}: ${host} → ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
    await sleep(Math.min(3000 * (attempt + 1), Math.max(0, timeLeft(OSM_BUDGET) - 20000)));
  }
  return null;
}

const KIND = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Street food & quick bites',
  bar: 'Bar',
  pub: 'Bar',
  ice_cream: 'Ice cream',
  food_court: 'Food hall',
  biergarten: 'Beer garden',
  bakery: 'Bakery',
  pastry: 'Pastry shop',
  coffee: 'Coffee roaster',
  deli: 'Deli',
  confectionery: 'Sweets',
  tortilla: 'Tortillería',
};

const commonsUrl = (v) => {
  const f = String(v).replace(/^File:/i, '').trim();
  return f ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f.replace(/ /g, '_'))}?width=900` : undefined;
};
const httpUrl = (v) => (v && /^https?:\/\//i.test(v) ? String(v).split(';')[0].trim() : undefined);
const igHandle = (v) => {
  if (!v) return undefined;
  const m = String(v).match(/instagram\.com\/([A-Za-z0-9_.]+)/i) || String(v).match(/^@?([A-Za-z0-9_.]{2,30})$/);
  return m ? '@' + m[1].replace(/\/$/, '') : undefined;
};

/** OSM elements → compact spots (pure; unit-tested). */
export function normalize(elements) {
  const out = new Map();
  for (const el of elements || []) {
    const t = el.tags || {};
    const name = (t.name || '').trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat == null || lon == null) continue;
    if (t.disused || t['disused:amenity'] || t.abandoned || /\b(cerrado|closed)\b/i.test(t.note || '')) continue;
    const kindKey = t.amenity || t.shop;
    const id = `osm-${el.type[0]}${el.id}`;
    const cuisine = (t.cuisine || '').split(/[;,]/).map((x) => x.trim().replace(/_/g, ' ')).filter(Boolean).slice(0, 3);
    const spot = {
      id,
      n: name.slice(0, 80),
      la: +lat.toFixed(6),
      lo: +lon.toFixed(6),
      k: KIND[kindKey] || 'Restaurant',
      ...(cuisine.length ? { c: cuisine } : {}),
      ...(t['addr:suburb'] || t['addr:neighbourhood'] ? { h: t['addr:suburb'] || t['addr:neighbourhood'] } : {}),
      ...(t['addr:street'] ? { a: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') } : {}),
      ...(httpUrl(t.website || t['contact:website']) ? { w: httpUrl(t.website || t['contact:website']) } : {}),
      ...(igHandle(t['contact:instagram'] || t.instagram) ? { ig: igHandle(t['contact:instagram'] || t.instagram) } : {}),
      ...(t.opening_hours ? { oh: t.opening_hours.slice(0, 120) } : {}),
      ...(t.phone || t['contact:phone'] ? { ph: (t.phone || t['contact:phone']).split(';')[0] } : {}),
      ...(httpUrl(t.image) || (t.wikimedia_commons && /^File:/i.test(t.wikimedia_commons)) ? { img: httpUrl(t.image) || commonsUrl(t.wikimedia_commons), imgSrc: httpUrl(t.image) ? 'OpenStreetMap' : 'Wikimedia Commons' } : {}),
      ...(t.brand || t['brand:wikidata'] ? { chain: t.brand || true } : {}),
      ...(t.start_date || t.opening_date ? { sd: String(t.start_date || t.opening_date).slice(0, 10) } : {}),
      ...(t.check_date ? { cd: String(t.check_date).slice(0, 10) } : {}),
      ...(el.version != null ? { v: el.version } : {}),
      ...(el.timestamp ? { ts: el.timestamp.slice(0, 10) } : {}),
      ...(t.diet_vegan === 'yes' || t['diet:vegan'] === 'yes' || t['diet:vegan'] === 'only' ? { vegan: true } : {}),
      ...(t.outdoor_seating === 'yes' ? { out: true } : {}),
    };
    out.set(id, spot);
  }
  return [...out.values()];
}

const CENTRE = { la: 19.42, lo: -99.16 }; // Roma / Condesa / Juárez: where most spots are

/**
 * The order to sweep tiles in: ones a previous run couldn't reach first, then
 * from the centre outwards — so a slow day still covers the busiest areas and
 * every run makes progress across the city (pure; unit-tested).
 */
export function tileOrder(ts, unswept = []) {
  const key = (b) => b.join(',');
  const pending = new Set(unswept.map(key));
  const d = (b) => distM({ la: (b[0] + b[2]) / 2, lo: (b[1] + b[3]) / 2 }, CENTRE);
  return [...ts].sort((a, b) => Number(pending.has(key(b))) - Number(pending.has(key(a))) || d(a) - d(b));
}

export async function sweepOsm(bbox, unswept = []) {
  const all = [];
  const failed = [];
  const ts = tileOrder(tiles(bbox), unswept);
  for (const [i, b] of ts.entries()) {
    const els = await overpass(overpassQuery(b), `tile ${i + 1}/${ts.length}`);
    if (!els) {
      failed.push(b);
      continue;
    }
    console.log(`  tile ${i + 1}/${ts.length}: ${els.length} elements`);
    all.push(...els);
    await sleep(4000); // be polite to the shared Overpass servers
  }
  return { spots: normalize(all), failedTiles: failed.length, failedBoxes: failed };
}

const inBox = (s, b) => s.la >= b[0] && s.lo >= b[1] && s.la < b[2] && s.lo < b[3];

/** Neighbourhood names (place=neighbourhood/suburb/quarter) for spots the map doesn't place in one. */
export async function hoods(bbox) {
  const els = await overpass(`[out:json][timeout:90];node["place"~"^(neighbourhood|suburb|quarter)$"]["name"](${bbox.join(',')});out;`, 'colonias');
  return (els || []).map((e) => ({ n: e.tags.name, la: e.lat, lo: e.lon }));
}

export function distM(a, b) {
  const R = 6371000;
  const dLa = ((b.la - a.la) * Math.PI) / 180;
  const dLo = ((b.lo - a.lo) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((a.la * Math.PI) / 180) * Math.cos((b.la * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function assignHoods(spots, hs) {
  if (!hs.length) return;
  for (const s of spots) {
    if (s.h) continue;
    let best = null;
    let bd = 1500;
    for (const h of hs) {
      if (Math.abs(h.la - s.la) > 0.02 || Math.abs(h.lo - s.lo) > 0.02) continue;
      const d = distM(s, h);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    if (best) s.h = best.n;
  }
}

// ── 2. newness ──────────────────────────────────────────────────────────────

/**
 * Why a spot counts as new, and since when (pure; unit-tested). `ledger` is
 * the previous run's id → first-seen map (null on the very first run).
 */
export function newness(s, ledger, now = Date.now()) {
  const reasons = [];
  let since = null;
  const fresh = (d, days) => d && now - Date.parse(d) >= 0 && now - Date.parse(d) <= days * DAY;
  if (ledger && ledger.ids && !ledger.ids[s.id] && !ledger.baselineOnly) {
    reasons.push('new on the map');
    since = today();
  } else if (ledger?.ids?.[s.id] && ledger.ids[s.id] !== ledger.baselineAt && fresh(ledger.ids[s.id], 120)) {
    reasons.push('new on the map');
    since = ledger.ids[s.id];
  }
  if (s.v === 1 && fresh(s.ts, 150)) {
    reasons.push('just added to OpenStreetMap');
    since = since && since < s.ts ? since : s.ts;
  }
  if (s.sd && /^\d{4}(-\d{2})?/.test(s.sd)) {
    const d = s.sd.length === 4 ? s.sd + '-07-01' : s.sd.length === 7 ? s.sd + '-15' : s.sd;
    if (fresh(d, 365)) {
      reasons.push('opened ' + s.sd.slice(0, 7));
      since = since && since < d ? since : d;
    }
  }
  return reasons.length ? { since, why: reasons } : null;
}

// ── 3. the press ────────────────────────────────────────────────────────────

export function parseRss(xml) {
  const items = [];
  for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const x = m[1];
    const tag = (t) => {
      const r = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`));
      return r ? r[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
    };
    const title = tag('title');
    if (!title) continue;
    items.push({ title, link: tag('link'), date: tag('pubDate'), source: tag('source') });
  }
  return items;
}

async function headlines() {
  const seen = new Map();
  for (const q of NEWS_QUERIES) {
    if (timeLeft(PHOTO_DEADLINE) < 120000) break;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:60d')}&hl=es-419&gl=MX&ceid=MX:es-419`;
    try {
      const r = await get(url, {}, 20000);
      if (!r.ok) {
        console.log(`  news "${q}": HTTP ${r.status}`);
        continue;
      }
      const items = parseRss(await r.text());
      items.forEach((i) => seen.set(i.link || i.title, i));
      console.log(`  news "${q}": ${items.length}`);
    } catch (e) {
      console.log(`  news "${q}": ${e.message}`);
    }
    await sleep(1200);
  }
  const cutoff = Date.now() - 90 * DAY;
  return [...seen.values()].filter((i) => !i.date || Date.parse(i.date) >= cutoff);
}

const GENERIC_NAMES = new Set(
  ['la casa', 'el rincon', 'cafe', 'restaurante', 'taqueria', 'tacos', 'la cocina', 'el patio', 'la terraza', 'el jardin', 'la esquina', 'el buen sabor', 'los tacos', 'la fonda', 'cafeteria', 'bar', 'la cantina', 'el mercado', 'la barra', 'el comedor', 'mexico', 'cdmx', 'roma', 'condesa', 'polanco', 'oxxo', 'starbucks', 'vips', 'sanborns', 'toks', 'italian coffee', 'el globo', 'krispy kreme', 'little caesars', 'dominos', 'kfc', 'burger king', 'mcdonalds', 'subway', 'carls jr'].map(words),
);

/** Is this name specific enough to find in a headline? */
export function matchable(name) {
  const w = words(name);
  if (!w || GENERIC_NAMES.has(w)) return false;
  return w.split(' ').length >= 2 ? w.length >= 7 : w.length >= 6;
}

/** Headlines that name each spot (pure; unit-tested). */
export function matchNews(items, named) {
  const hits = new Map();
  const heads = items.map((i) => ({ i, t: ' ' + words(i.title) + ' ' }));
  for (const s of named) {
    if (!matchable(s.n)) continue;
    const key = ' ' + words(s.n) + ' ';
    for (const h of heads) {
      if (h.t.includes(key)) {
        const l = hits.get(s.id) || [];
        if (l.length < 4) l.push({ title: h.i.title.slice(0, 160), link: h.i.link, source: h.i.source, date: h.i.date ? new Date(h.i.date).toISOString().slice(0, 10) : undefined });
        hits.set(s.id, l);
      }
    }
  }
  return hits;
}

// ── 4. diners' suggestions ──────────────────────────────────────────────────

function supabaseConfig() {
  try {
    const cfg = fs.readFileSync('src/config.ts', 'utf8');
    return { url: (cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1], key: (cfg.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/) || [])[1] };
  } catch {
    return {};
  }
}

async function suggestions() {
  const { url, key } = supabaseConfig();
  if (!url || !key) return [];
  try {
    const r = await get(`${url}/rest/v1/spot_suggestions?select=id,kind,name,place_id,lat,lon,hood,link,note,created_at&order=created_at.desc&limit=500`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }, 15000);
    if (!r.ok) {
      console.log(`  suggestions: HTTP ${r.status}`);
      return [];
    }
    return await r.json();
  } catch (e) {
    console.log(`  suggestions: ${e.cause?.code || e.message}`);
    return [];
  }
}

// ── the guide (to link, not duplicate) ──────────────────────────────────────

function readGuide() {
  try {
    const t = fs.readFileSync('src/data/carte.ts', 'utf8');
    const a = t.indexOf('= [', t.indexOf('const RAW')) + 2;
    return JSON.parse(t.slice(a, t.indexOf('\n];', a) + 2)).map((v) => ({ id: v.id, n: v.name, la: v.lat, lo: v.lon }));
  } catch {
    return [];
  }
}

export function linkGuide(spots, guide) {
  const byName = new Map();
  guide.forEach((g) => byName.set(words(g.n), g));
  for (const s of spots) {
    const g = byName.get(words(s.n));
    if (g && (g.la == null || distM(s, g) < 400)) s.guide = g.id;
  }
}

// ── 5. pictures ─────────────────────────────────────────────────────────────

async function websitePhotos(cands, prevMedia) {
  let unfurl;
  try {
    ({ unfurl } = await import('./collect-media.mjs'));
  } catch {
    return {};
  }
  const tried = {};
  let i = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (i < cands.length && timeLeft(PHOTO_DEADLINE) > 60000) {
        const s = cands[i++];
        const u = await Promise.race([unfurl(s.w, true).catch(() => null), sleep(25000).then(() => null)]);
        tried[s.id] = u?.image ? { img: u.image, src: 'their website', at: today() } : { none: true, at: today() };
      }
    }),
  );
  const found = Object.values(tried).filter((x) => x.img).length;
  // (sites not reached before the deadline are simply tried next run)
  console.log(`  pictures: ${found} found on ${cands.length} websites`);
  return { ...prevMedia, ...tried };
}

/** Commons photos taken right at the spot whose file name carries its name. */
export function commonsMatch(spot, pages) {
  const name = ' ' + words(spot.n) + ' ';
  if (!matchable(spot.n)) return null;
  for (const p of pages) {
    const t = ' ' + words(String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')) + ' ';
    if (t.includes(name) && !/\blogo\b|\bmap\b|\bmapa\b/.test(t)) return p;
  }
  return null;
}

async function commonsNearby(cands) {
  const out = {};
  for (const s of cands) {
    if (timeLeft(PHOTO_DEADLINE) < 30000) break;
    try {
      const r = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&list=geosearch&gscoord=${s.la}|${s.lo}&gsradius=40&gsnamespace=6&gslimit=30`, { headers: { Accept: 'application/json' } }, 15000);
      const d = r.ok ? await r.json() : null;
      const hit = commonsMatch(s, d?.query?.geosearch || []);
      if (hit) out[s.id] = { img: commonsUrl(hit.title), src: 'Wikimedia Commons', at: today() };
    } catch {}
    await sleep(250);
  }
  console.log(`  pictures: ${Object.keys(out).length} found on Commons near ${cands.length} spots`);
  return out;
}

// ── scoring the discovery pool ──────────────────────────────────────────────

/** How worth surfacing a spot is, before any personal taste (pure; unit-tested). */
export function poolScore(s) {
  let x = 0;
  if (s.new) x += 40 + Math.max(0, 30 - (Date.now() - Date.parse(s.new.since || today())) / DAY / 4);
  if (s.buzz) x += 25 + 8 * Math.min(3, s.buzz.length);
  if (s.sug) x += 30;
  x += (s.c ? 4 : 0) + (s.oh ? 4 : 0) + (s.w || s.ig ? 5 : 0) + (s.img ? 8 : 0) + (s.h ? 2 : 0);
  if (s.chain) x -= 30;
  if (s.guide) x -= 15; // already in the guide — the app has its full page
  return Math.round(x);
}

const tileKey = (s) => `${Math.floor(s.la / TILE)}_${Math.floor(s.lo / TILE)}`;

// ── main ────────────────────────────────────────────────────────────────────

async function prevJson(rel) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await get(SITE + rel + '?t=' + Date.now(), {}, 30000);
      if (r.status === 404) return { missing: true };
      if (r.ok) return { data: await r.json() };
    } catch {}
    await sleep(3000);
  }
  return { error: true };
}

function write(rel, data) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
}

/** Re-publish the previous run's files (fresh enough, or this sweep failed). */
async function republish(index) {
  const files = ['spots-index.json', 'spots-new.json', 'spots-ledger.json', 'spots-media.json', 'news.json', ...Object.keys(index.tiles || {}).map((k) => `spots/${k}.json`)];
  let ok = 0;
  for (const f of files) {
    const r = await prevJson('data/' + f);
    if (r.data) {
      write(f, r.data);
      ok++;
    }
  }
  console.log(`re-published ${ok}/${files.length} files from the live site`);
  return ok === files.length;
}

export async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const prevIndex = await prevJson('data/spots-index.json');
  if (!FORCE && prevIndex.data?.generated_at && Date.now() - Date.parse(prevIndex.data.generated_at) < SWEEP_HOURS * 36e5) {
    console.log(`spots are ${((Date.now() - Date.parse(prevIndex.data.generated_at)) / 36e5).toFixed(1)} h old — re-publishing (FORCE=1 to sweep)`);
    if (await republish(prevIndex.data)) return;
    console.log('could not re-publish everything — sweeping instead');
  }

  const ledgerRes = await prevJson('data/spots-ledger.json');
  const mediaRes = await prevJson('data/spots-media.json');
  // Unknown history (couldn't read it): treat everything as already known, never as new.
  const ledger = ledgerRes.data || (ledgerRes.missing ? null : { ids: {}, baselineOnly: true });
  const prevMedia = mediaRes.data?.items || {};

  console.log('sweeping OpenStreetMap…');
  const { spots, failedTiles, failedBoxes } = await sweepOsm(CITY.bbox, ledger?.unswept || []);
  // Areas the sweep couldn't reach this time keep last sweep's spots (no holes in the map).
  if (failedBoxes.length && prevIndex.data?.tiles) {
    let carried = 0;
    const have = new Set(spots.map((s) => s.id));
    for (const k of Object.keys(prevIndex.data.tiles)) {
      const [a, o] = k.split('_').map(Number);
      const centre = { la: (a + 0.5) * TILE, lo: (o + 0.5) * TILE };
      if (!failedBoxes.some((b) => inBox(centre, b))) continue;
      const r = await prevJson(`data/spots/${k}.json`);
      for (const s of r.data || []) {
        if (have.has(s.id)) continue;
        delete s.new; // not re-judged this run
        spots.push(s);
        have.add(s.id);
        carried++;
      }
    }
    console.log(`  carried ${carried} spots over from the last sweep for ${failedBoxes.length} unreachable tiles`);
  }
  const prevCount = ledger?.count || 0;
  if (!spots.length || (prevCount && spots.length < prevCount * 0.6)) {
    console.log(`sweep incomplete (${spots.length} spots, ${failedTiles} tiles failed, ${prevCount} last time)`);
    if (prevIndex.data && (await republish(prevIndex.data))) return;
    if (!spots.length) {
      console.log('no spots and nothing to re-publish — the app will run without discovered spots this deploy');
      return;
    }
  }
  console.log(`${spots.length} spots`);
  assignHoods(spots, await hoods(CITY.bbox));
  linkGuide(spots, readGuide());

  // newness, with the ledger carried forward
  const ids = { ...(ledger?.ids || {}) };
  const baselineAt = ledger?.baselineAt || today();
  const firstRun = !ledger;
  // Areas never swept before (a first sweep that missed tiles) join the baseline:
  // their spots aren't "new on the map", just newly reached.
  const unswept = ledger?.unswept || [];
  for (const s of spots) {
    const baseline = firstRun || (!ids[s.id] && unswept.some((b) => inBox(s, b)));
    const n = baseline ? newness(s, null) : newness(s, ledger);
    if (n) s.new = n;
    if (!ids[s.id]) ids[s.id] = baseline ? baselineAt : today();
  }

  console.log('reading the press…');
  const news = await headlines();
  const guide = readGuide();
  const hits = matchNews(news, [...spots, ...guide.map((g) => ({ id: g.id, n: g.n }))]);
  for (const s of spots) if (hits.get(s.id)) s.buzz = hits.get(s.id);

  console.log("reading diners' suggestions…");
  const sugs = await suggestions();
  const sugSpots = [];
  for (const g of sugs.filter((x) => x.kind === 'new')) {
    const match = spots.find((s) => words(s.n) === words(g.name) && (g.lat == null || distM(s, { la: g.lat, lo: g.lon }) < 500));
    if (match) match.sug = { at: String(g.created_at).slice(0, 10) };
    else if (g.lat != null && g.lon != null) sugSpots.push({ id: `sug-${g.id}`, n: String(g.name).slice(0, 80), la: g.lat, lo: g.lon, k: 'Restaurant', ...(g.hood ? { h: g.hood } : {}), ...(g.link ? { w: g.link } : {}), sug: { at: String(g.created_at).slice(0, 10), note: g.note || undefined }, new: { since: String(g.created_at).slice(0, 10), why: ['suggested by a diner'] } });
  }
  const closed = new Set(sugs.filter((x) => x.kind === 'closed' && x.place_id).map((x) => x.place_id));
  const all = [...spots.filter((s) => !closed.has(s.id)), ...sugSpots];

  // pictures: what OSM links, what we found before, then a budget of websites
  const media = { ...prevMedia };
  const cands = all
    .filter((s) => !s.img && s.w && !s.chain && !(media[s.id] && (media[s.id].img || Date.now() - Date.parse(media[s.id].at) < 30 * DAY)))
    .sort((a, b) => poolScore(b) - poolScore(a))
    .slice(0, PHOTO_BUDGET);
  console.log(`looking for pictures on ${cands.length} websites…`);
  Object.assign(media, await websitePhotos(cands, {}));
  const nearCands = all
    .filter((s) => !s.img && !media[s.id]?.img && !s.chain && matchable(s.n) && (s.new || s.buzz || s.sug || s.guide))
    .sort((a, b) => poolScore(b) - poolScore(a))
    .slice(0, 80);
  Object.assign(media, await commonsNearby(nearCands));
  for (const s of all) {
    if (!s.img && media[s.id]?.img) {
      s.img = media[s.id].img;
      s.imgSrc = media[s.id].src;
    }
  }

  // the discovery pool
  const pool = all
    .filter((s) => !s.chain && (s.new || s.buzz || s.sug || ((s.c || s.oh) && (s.w || s.ig || s.img))))
    .map((s) => ({ ...s, ps: poolScore(s) }))
    .sort((a, b) => b.ps - a.ps)
    .slice(0, 1500);

  const byTile = {};
  for (const s of all) (byTile[tileKey(s)] = byTile[tileKey(s)] || []).push(s);
  for (const [k, list] of Object.entries(byTile)) write(`spots/${k}.json`, list);

  const newCount = all.filter((s) => s.new).length;
  const buzzCount = all.filter((s) => s.buzz).length;
  write('spots-new.json', { generated_at: new Date().toISOString(), city: CITY.id, spots: pool });
  write('spots-ledger.json', { v: 1, city: CITY.id, baselineAt, count: spots.length, ids, unswept: failedBoxes });
  write('spots-media.json', { v: 1, items: media });
  write('news.json', { generated_at: new Date().toISOString(), items: news.slice(0, 200).map((i) => ({ title: i.title.slice(0, 160), link: i.link, source: i.source, date: i.date })), matched: Object.fromEntries(hits) });
  const index = {
    generated_at: new Date().toISOString(),
    city: CITY.id,
    tile: TILE,
    count: all.length,
    pool: pool.length,
    new: newCount,
    buzz: buzzCount,
    suggested: all.filter((s) => s.sug).length,
    with_photo: all.filter((s) => s.img).length,
    first_run: firstRun,
    unreachable_tiles: failedTiles,
    sources: { osm: spots.length, news: news.length, suggestions: sugs.length },
    tiles: Object.fromEntries(Object.entries(byTile).map(([k, v]) => [k, v.length])),
  };
  write('spots-index.json', index);
  console.log('wrote', OUT, JSON.stringify({ ...index, tiles: Object.keys(index.tiles).length }));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error('discovery failed (the deploy continues):', e);
    process.exit(0);
  });
}
