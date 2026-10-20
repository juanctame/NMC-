#!/usr/bin/env node
/**
 * The landing reel — HD clips that loop behind the sign-in screen.
 *
 * Starts from the platform's own playable clips (src/data/clipsOpen.json —
 * Wikimedia Commons / Internet Archive files already shown on restaurant pages)
 * and widens to Commons footage of Mexico City food (its video categories and a
 * few searches), keeping only what is genuinely HD: a ≥720p rendition a browser
 * plays (VP9 WebM / H.264 MP4) of a ≥720p original. Upscaled 480p never counts.
 *
 * Each clip keeps its credit (creator, licence, source page) and, when it came
 * from a restaurant page, that restaurant. Output: src/data/landingReel.json.
 * Runs in CI (open internet) before the web export; if a run finds fewer clips
 * than last time (a slow API), the previous ones it didn't re-check are kept.
 */
import fs from 'node:fs';
import { fold, ELSEWHERE } from './lib/relevance.mjs';

const OUT = 'src/data/landingReel.json';
const OPEN = 'src/data/clipsOpen.json';
const UA = 'CRTQ-landing-reel/1.0 (https://github.com/juanctame/NMC-)';
const MAX = 8;
const BUDGET_MS = Number(process.env.REEL_BUDGET_S || 240) * 1000;
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const left = () => BUDGET_MS - (Date.now() - t0);

async function getJson(url, tries = 2) {
  for (let i = 0; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429) {
        await sleep(3000 * (i + 1));
        continue;
      }
      if (!r.ok) return null;
      return await r.json();
    } catch {
      await sleep(800 * (i + 1));
    }
  }
  return null;
}

const strip = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

// What a landing clip must show: food, cooking, a market, a taquería…
const FOODY =
  /\btacos?\b|taquer|tortill|comal|nixtamal|\bmaiz\b|elote|esquite|tamal|\bmole\b|pozole|barbacoa|birria|carnitas|pastor|quesadilla|gordita|tlacoyo|huarache|sope|antojit|garnacha|churro|pan dulce|panader|concha|mercado|market|tianguis|comida|\bfood\b|cocina|cooking|cocinando|\bchef\b|restaurant|fonda|cantina|mezcal|pulque|tequila|cafe\b|coffee|chocolate|cacao|salsa|\bchiles?\b|street food|puesto/;
const CITY = /ciudad de mexico|mexico city|\bcdmx\b|\bdf\b|coyoacan|xochimilco|zocalo|centro historico|merced|jamaica|roma|condesa|tlalpan|iztapalapa|garibaldi|polanco|mexico\b|mexican|mexicana|mexicano/;
const NOPE = /matanza|slaughter|sacrific|sangre|blood|protest|marcha|accidente|police|policia|funeral|hospital|covid|sismo|earthquake|incendio|fire\b|disparo|balacera|lecture|conferencia|entrevista|interview|timelapse of traffic/;

// Places that aren't Mexico (beyond relevance.mjs's list) — markets and street food abound worldwide.
const FAR = /thailand|tailandia|bangkok|damnoen|vietnam|hanoi|saigon|india|delhi|mumbai|china|beijing|taiwan|taipei|korea|seoul|indonesia|bali|philippines|manila|peru|lima|chile\b|santiago de chile|ecuador|cuba|habana|morocco|marruecos|marrakech|turkey|turquia|istanbul|egypt|egipto|nigeria|kenya|brasil|brazil|rio de janeiro|sao paulo|uruguay|el salvador|nicaragua|panama|puerto rico|oaxaca de juarez|chiapas|yucatan|jalisco|michoacan|veracruz/;

const playable = (t) => /^video\/webm/.test(t || '') || (/^video\/mp4/.test(t || '') && !/mp4v/.test(t || ''));

/** Commons pages (with videoinfo) → HD reel clips. */
function fromCommonsPages(pages, ctx = {}) {
  const out = [];
  for (const p of Object.values(pages || {})) {
    const vi = (p.videoinfo || [])[0];
    if (!vi || !/^video\/|application\/ogg/.test(vi.mime || '')) continue;
    if (Math.min(vi.height || 0, vi.width || 0) < 720) continue; // the original itself must be HD (landscape or portrait)
    const secs = Number(vi.duration || 0);
    if (secs && (secs < 6 || secs > 1800)) continue;
    const short = (x) => Math.min(x.height || 0, x.width || 1e9);
    const ders = (vi.derivatives || []).filter((x) => x.src && /\/transcoded\//.test(x.src) && playable(x.type) && (x.height || 0) >= 720 && short(x) >= 720);
    if (!ders.length) continue;
    const em = vi.extmetadata || {};
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    const desc = strip(em.ImageDescription?.value);
    const cats = strip(em.Categories?.value);
    const text = fold([title, desc, cats].join(' '));
    if (NOPE.test(text)) continue;
    if (!ctx.trusted) {
      // the footage itself must be about food: a food word in its own title
      // ("Mercado" only as a market — "mercado de…", "en el mercado" — never a surname)
      const ft = fold(title).replace(/\bmercado\b(?! de| del| en| municipal| popular| flotante)/g, '');
      if (!FOODY.test(ft) && !/\b(?:el|un|al) mercado\b/.test(fold(title))) continue;
      if (secs > 300) continue;
      if (FAR.test(text)) continue;
      if (!CITY.test(text) && !ctx.mexican) continue;
      if (ELSEWHERE.test(text) && !/ciudad de mexico|mexico city|cdmx/.test(text)) continue;
    }
    // ≤1080p renditions only (4K would be wasted on a background), best first
    const sources = ders
      .filter((x) => (x.height || 0) <= 1080)
      .sort((a, b) => (b.height || 0) - (a.height || 0) || (/mp4/.test(a.type) ? -1 : 1))
      .map((x) => ({ src: x.src, type: String(x.type).split(';')[0], height: x.height }));
    if (!sources.length) continue;
    out.push({
      id: 'commons:' + p.title,
      title,
      creator: strip(em.Artist?.value) || 'Wikimedia Commons contributor',
      license: strip(em.LicenseShortName?.value),
      page: vi.descriptionurl,
      poster: vi.thumburl || null,
      sources,
      width: vi.width,
      height: vi.height,
      durationSec: Math.round(secs) || null,
      placeId: ctx.placeId || null,
      via: ctx.via || 'commons',
    });
  }
  return out;
}

const VIINFO = '&prop=videoinfo&viprop=url|mime|size|mediatype|extmetadata|derivatives&viurlwidth=1280';
const API = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=1';

const stats = {};
const tally = (k, raw, kept) => ((stats[k] = stats[k] || { files: 0, hd: 0 }), (stats[k].files += raw), (stats[k].hd += kept));

/**
 * The API hands videoinfo for a big page set over several `continue` rounds
 * (extmetadata is costly), so follow them until every page has its info.
 */
async function queryAll(url) {
  const pages = {};
  let cont = '';
  for (let i = 0; i < 10 && left() > 0; i++) {
    const d = await getJson(url + cont);
    for (const [id, p] of Object.entries(d?.query?.pages || {})) {
      const had = pages[id];
      pages[id] = had ? { ...had, videoinfo: had.videoinfo || p.videoinfo } : p;
    }
    // done once this page set is complete (don't page the generator onwards)
    if (!d?.continue || 'batchcomplete' in d) break;
    cont = '&' + new URLSearchParams(d.continue).toString();
    await sleep(200);
  }
  return pages;
}

async function commonsByTitles(titles, ctx, k = 'restaurant pages') {
  const pages = await queryAll(`${API}&titles=${encodeURIComponent(titles.join('|'))}${VIINFO}`);
  const out = fromCommonsPages(pages, ctx);
  tally(k, Object.keys(pages).length, out.length);
  return out;
}
async function commonsCategory(cat, ctx) {
  const pages = await queryAll(`${API}&generator=categorymembers&gcmtype=file&gcmlimit=50&gcmtitle=${encodeURIComponent('Category:' + cat)}${VIINFO}`);
  const out = fromCommonsPages(pages, ctx);
  tally('Category:' + cat, Object.keys(pages).length, out.length);
  return out;
}
async function commonsSearch(q, ctx) {
  const pages = await queryAll(`${API}&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=${encodeURIComponent(q + ' filetype:video')}${VIINFO}`);
  const out = fromCommonsPages(pages, ctx);
  tally('search: ' + q, Object.keys(pages).length, out.length);
  return out;
}

/** An Internet Archive item → an HD MP4 rendition, if it has one. */
async function archiveItem(identifier, ctx) {
  const md = await getJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  const files = (md?.files || []).filter((f) => /\.mp4$/i.test(f.name || '') && +f.height >= 720 && +f.height <= 1080);
  if (!files.length) return [];
  const f = files.sort((a, b) => +b.height - +a.height)[0];
  const len = String(f.length || '');
  const secs = len.includes(':') ? len.split(':').reduce((s, n) => s * 60 + +n, 0) : +len || 0;
  const m = md.metadata || {};
  return [
    {
      id: 'archive:' + identifier,
      title: strip(Array.isArray(m.title) ? m.title[0] : m.title) || identifier,
      creator: strip(Array.isArray(m.creator) ? m.creator[0] : m.creator) || 'Internet Archive uploader',
      license: m.licenseurl ? String(m.licenseurl) : '',
      page: `https://archive.org/details/${identifier}`,
      poster: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
      sources: [{ src: `https://archive.org/download/${encodeURIComponent(identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}`, type: 'video/mp4', height: +f.height }],
      width: +f.width || null,
      height: +f.height,
      durationSec: Math.round(secs) || null,
      placeId: ctx.placeId || null,
      via: ctx.via || 'archive',
    },
  ];
}

async function main() {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { clips: [] };
  const found = new Map();
  const add = (cs) => cs.forEach((c) => !found.has(c.id) && found.set(c.id, c));

  // 1. The platform's own files (restaurant pages) — HD renditions where they exist.
  const open = fs.existsSync(OPEN) ? JSON.parse(fs.readFileSync(OPEN, 'utf8')) : { venues: {} };
  const own = new Map();
  for (const v of Object.values(open.venues || {}))
    for (const c of v.clips || []) {
      if (c.platform === 'commons' && c.sourceUrl) own.set('commons:' + decodeURIComponent(c.sourceUrl.split('/wiki/')[1] || '').replace(/_/g, ' '), c);
      if (c.platform === 'archive') own.set(c.id, c);
    }
  const ownCommons = [...own.keys()].filter((k) => k.startsWith('commons:')).map((k) => k.slice(8));
  for (let i = 0; i < ownCommons.length && left() > 0; i += 20) {
    const batch = ownCommons.slice(i, i + 20);
    for (const t of batch) {
      const c = own.get('commons:' + t);
      add(await commonsByTitles([t], { trusted: true, placeId: c.scope === 'venue' ? c.placeId : null, via: 'restaurant page' }));
      await sleep(200);
    }
  }
  for (const [k, c] of own) if (k.startsWith('archive:') && left() > 0) add(await archiveItem(k.slice(8), { placeId: c.scope === 'venue' ? c.placeId : null, via: 'restaurant page' }));
  const fromPlatform = found.size;

  // 2. Commons footage of Mexico City food: its real video categories (found by
  // name, not guessed), then plain searches by dish, market and neighbourhood.
  const cats = new Map();
  for (const q of ['Videos Mexico City', 'Videos Mexican cuisine', 'Videos food Mexico', 'Videos markets Mexico', 'Videos tacos', 'Videos tortillas', 'Videos street food Mexico', 'Videos Ciudad de México']) {
    if (left() < 0) break;
    const d = await getJson(`${API}&list=search&srnamespace=14&srlimit=10&srsearch=${encodeURIComponent(q)}`);
    for (const r of d?.query?.search || []) {
      const name = String(r.title).replace(/^Category:/, '');
      const f = fold(name);
      if (!/^videos? /.test(f)) continue;
      if (!(/mexic|cdmx|ciudad de mexico/.test(f) || FOODY.test(f))) continue;
      if (ELSEWHERE.test(f)) continue;
      cats.set(name, { mexican: /mexic/.test(f) });
    }
    await sleep(200);
  }
  for (const [cat, ctx] of cats) {
    if (left() < 0 || found.size >= MAX * 3) break;
    add(await commonsCategory(cat, ctx));
    await sleep(250);
  }
  const QUERIES = [
    'tacos', 'taquería', 'tortillas', 'tortillería', 'comal', 'tamales', 'elotes', 'pozole', 'mole', 'churros', 'pan de muerto', 'quesadillas',
    'Mexico City food', 'Ciudad de México comida', 'street food Mexico', 'comida callejera', 'mercado México',
    'Mercado de la Merced', 'Mercado de Jamaica', 'Mercado de San Juan', 'Mercado de Coyoacán', 'Mercado de Sonora', 'Xochimilco', 'Coyoacán', 'Garibaldi',
  ];
  for (const q of QUERIES) {
    if (left() < 0 || found.size >= MAX * 3) break;
    add(await commonsSearch(q, {}));
    await sleep(250);
  }
  console.log(`  categories found: ${[...cats.keys()].join(' · ') || 'none'}`);

  // Pick: the platform's own first, then 1080p before 720p, then wider shots; one per title stem.
  const stem = (c) => fold(c.title).replace(/[^a-z]+/g, ' ').split(' ').slice(0, 3).join(' ');
  const ranked = [...found.values()].sort((a, b) => (b.placeId ? 1 : 0) - (a.placeId ? 1 : 0) || (b.via === 'restaurant page' ? 1 : 0) - (a.via === 'restaurant page' ? 1 : 0) || b.sources[0].height - a.sources[0].height || (b.width || 0) / (b.height || 1) - (a.width || 0) / (a.height || 1));
  // Variety: one per title stem and at most two per creator — relaxed only if
  // that would leave the reel short.
  const picked = [];
  const stems = new Set();
  const byCreator = {};
  for (const perCreator of [2, MAX]) {
    for (const c of ranked) {
      if (picked.length >= MAX || (perCreator === MAX && picked.length >= 5)) break;
      if (picked.includes(c) || stems.has(stem(c)) || (byCreator[c.creator] || 0) >= perCreator) continue;
      stems.add(stem(c));
      byCreator[c.creator] = (byCreator[c.creator] || 0) + 1;
      picked.push(c);
    }
  }
  // A slow run never shrinks the reel: keep earlier clips it didn't get to.
  for (const c of prev.clips || []) if (picked.length < MAX && !picked.some((x) => x.id === c.id) && (left() < 0 || picked.length < 3)) picked.push(c);

  // Where each clip starts: past any intro, ~15% in.
  for (const c of picked) c.start = c.durationSec && c.durationSec > 20 ? Math.round(c.durationSec * 0.15) : 0;

  const out = { version: 1, generatedAt: new Date().toISOString(), took: Math.round((Date.now() - t0) / 1000) + 's', checked: found.size, fromPlatform, clips: picked };
  if (!picked.length && (prev.clips || []).length) {
    console.log('no HD clips found this run — keeping the previous reel');
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v.files} files, ${v.hd} HD + on topic`);
  console.log(`landing reel: ${picked.length} HD clips (${fromPlatform} HD from restaurant pages, ${found.size} HD candidates)`);
  for (const c of picked) console.log(` - ${c.sources[0].height}p ${c.title} — ${c.creator} (${c.license || 'no licence tag'})${c.placeId ? ' @' + c.placeId : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(0);
});
