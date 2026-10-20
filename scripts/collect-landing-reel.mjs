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

const playable = (t) => /^video\/webm/.test(t || '') || (/^video\/mp4/.test(t || '') && !/mp4v/.test(t || ''));

/** Commons pages (with videoinfo) → HD reel clips. */
function fromCommonsPages(pages, ctx = {}) {
  const out = [];
  for (const p of Object.values(pages || {})) {
    const vi = (p.videoinfo || [])[0];
    if (!vi || !/^video\/|application\/ogg/.test(vi.mime || '')) continue;
    if ((vi.height || 0) < 720 || (vi.width || 0) < 960) continue; // the original itself must be HD
    const secs = Number(vi.duration || 0);
    if (secs && (secs < 6 || secs > 1800)) continue;
    const ders = (vi.derivatives || []).filter((x) => x.src && playable(x.type) && (x.height || 0) >= 720);
    if (!ders.length) continue;
    const em = vi.extmetadata || {};
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    const desc = strip(em.ImageDescription?.value);
    const cats = strip(em.Categories?.value);
    const text = fold([title, desc, cats].join(' '));
    if (NOPE.test(text)) continue;
    if (!ctx.trusted) {
      if (!FOODY.test(text)) continue;
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

async function commonsByTitles(titles, ctx) {
  const d = await getJson(`${API}&titles=${encodeURIComponent(titles.join('|'))}${VIINFO}`);
  return fromCommonsPages(d?.query?.pages, ctx);
}
async function commonsCategory(cat, ctx) {
  const d = await getJson(`${API}&generator=categorymembers&gcmtype=file&gcmlimit=100&gcmtitle=${encodeURIComponent('Category:' + cat)}${VIINFO}`);
  return fromCommonsPages(d?.query?.pages, ctx);
}
async function commonsSearch(q, ctx) {
  const d = await getJson(`${API}&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=${encodeURIComponent(q + ' filetype:video')}${VIINFO}`);
  return fromCommonsPages(d?.query?.pages, ctx);
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

  // 2. Commons footage of Mexico City food.
  const CATS = [
    ['Videos of Mexican cuisine', { mexican: true }],
    ['Videos of food of Mexico', { mexican: true }],
    ['Videos of street food in Mexico', { mexican: true }],
    ['Videos of tacos', {}],
    ['Videos of tortillas', {}],
    ['Videos of markets in Mexico', { mexican: true }],
    ['Videos of Mexico City', {}],
    ['Videos of Centro Histórico (Mexico City)', {}],
    ['Videos of Coyoacán', {}],
    ['Videos of Xochimilco', {}],
  ];
  for (const [cat, ctx] of CATS) {
    if (left() < 0 || found.size >= MAX * 3) break;
    add(await commonsCategory(cat, ctx));
    await sleep(250);
  }
  const QUERIES = ['tacos Ciudad de México', 'taquería Mexico City', 'tortillas comal México', 'mercado Ciudad de México comida', 'street food Mexico City', 'comida callejera Ciudad de México', 'elotes esquites', 'tamales México', 'cocina mexicana'];
  for (const q of QUERIES) {
    if (left() < 0 || found.size >= MAX * 3) break;
    add(await commonsSearch(q, {}));
    await sleep(250);
  }

  // Pick: the platform's own first, then 1080p before 720p, then wider shots; one per title stem.
  const stem = (c) => fold(c.title).replace(/[^a-z]+/g, ' ').split(' ').slice(0, 3).join(' ');
  const ranked = [...found.values()].sort((a, b) => (b.placeId ? 1 : 0) - (a.placeId ? 1 : 0) || (b.via === 'restaurant page' ? 1 : 0) - (a.via === 'restaurant page' ? 1 : 0) || b.sources[0].height - a.sources[0].height || (b.width || 0) / (b.height || 1) - (a.width || 0) / (a.height || 1));
  const picked = [];
  const stems = new Set();
  for (const c of ranked) {
    if (picked.length >= MAX) break;
    if (stems.has(stem(c))) continue;
    stems.add(stem(c));
    picked.push(c);
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
  console.log(`landing reel: ${picked.length} HD clips (${fromPlatform} HD from restaurant pages, ${found.size} HD candidates)`);
  for (const c of picked) console.log(` - ${c.sources[0].height}p ${c.title} — ${c.creator} (${c.license || 'no licence tag'})${c.placeId ? ' @' + c.placeId : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(0);
});
