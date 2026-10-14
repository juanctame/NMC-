#!/usr/bin/env node
/**
 * Collect clips for the guide's venues from every open source that needs no API
 * key, so the clip feed has real content even while the YouTube Data API is off:
 *
 *  1. Curated (src/data/clipsCurated.json) — hand-found YouTube / TikTok /
 *     Instagram / Vimeo clips, verified here through each platform's public
 *     oEmbed: removed, private or non-embeddable ones drop out, and the title,
 *     creator and thumbnail come from the platform itself. Clips posted by the
 *     venue, its chef or its own accounts are dropped (src/data/clipRank.ts).
 *  2. Dailymotion — the public search API, by venue name; kept only when the
 *     title / description is about the venue and the uploader is third-party.
 *  3. Wikimedia Commons — freely licensed video files (WebM, with MP4 where
 *     transcoded), played natively in the app: by venue name first, else by the
 *     venue's signature dish or neighbourhood, labelled as related.
 *  4. Internet Archive — MP4 files, the same way.
 *
 * Every clip keeps its source and credit; a clip that is about a dish or a
 * neighbourhood (not the venue itself) is marked `scope: 'dish' | 'area'` with
 * `relatedTo`, and the app labels it as related rather than as the venue's.
 *
 * Output: src/data/clipsOpen.json. Runs in CI (open internet), at most every
 * ~20 h unless FORCE=1 or the curated list changed.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const OUT = 'src/data/clipsOpen.json';
const CURATED = 'src/data/clipsCurated.json';
const MIN_GAP_HOURS = 20;
const UA = 'CRTQ-clip-collector/1.0 (https://github.com/juanctame/NMC-)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadRules() {
  const src = fs.readFileSync('src/data/clipRank.ts', 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, require);
  return m.exports;
}

function readVenues() {
  const t = fs.readFileSync('src/data/carte.ts', 'utf8');
  const a = t.indexOf('= [', t.indexOf('const RAW')) + 2;
  return JSON.parse(t.slice(a, t.indexOf('\n];', a) + 2));
}

/** Seed venues outside the guide that curated clips may point at (store/data.ts RANKED0). */
const SEED_VENUES = { rosetta: { id: 'rosetta', name: 'Panadería Rosetta', hood: 'Roma Norte', instagram: '@rosettapanaderia' } };

async function getJson(url, tries = 2) {
  for (let i = 0; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (r.status === 404 || r.status === 401 || r.status === 403 || r.status === 400) return { __status: r.status };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === tries) return { __error: String(e.message || e) };
      await sleep(800 * (i + 1));
    }
  }
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
const fold = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// ── 1. curated → oEmbed ──────────────────────────────────────────────────────

function parseUrl(url) {
  let m;
  if ((m = /youtube\.com\/(?:watch\?v=|shorts\/|embed\/)([\w-]{11})/.exec(url) || /youtu\.be\/([\w-]{11})/.exec(url))) return { platform: 'youtube', embedId: m[1], short: /shorts\//.test(url) };
  if ((m = /tiktok\.com\/@([^/]+)\/video\/(\d+)/.exec(url))) return { platform: 'tiktok', embedId: m[2], handle: '@' + m[1] };
  if ((m = /instagram\.com\/(?:reel|p)\/([\w-]+)/.exec(url))) return { platform: 'instagram', embedId: m[1] };
  if ((m = /vimeo\.com\/(\d+)/.exec(url))) return { platform: 'vimeo', embedId: m[1] };
  if ((m = /dailymotion\.com\/video\/([\w]+)/.exec(url))) return { platform: 'dailymotion', embedId: m[1] };
  return null;
}

const OEMBED = {
  youtube: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  vimeo: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`,
  dailymotion: (u) => `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(u)}`,
};

async function curated(R, venueById) {
  const list = JSON.parse(fs.readFileSync(CURATED, 'utf8')).clips || [];
  const out = [];
  const dropped = [];
  for (const c of list) {
    const v = venueById[c.placeId];
    const p = parseUrl(c.url);
    if (!v || !p) {
      dropped.push([c.url, !v ? 'unknown venue' : 'unknown platform']);
      continue;
    }
    let meta = {};
    if (OEMBED[p.platform]) {
      meta = await getJson(OEMBED[p.platform](c.url));
      await sleep(250);
      if (meta.__status || meta.__error) {
        dropped.push([c.url, meta.__status ? 'oEmbed ' + meta.__status + ' (removed / private / not embeddable)' : meta.__error]);
        continue;
      }
    }
    const creator = strip(meta.author_name) || (p.handle || '').replace(/^@/, '') || 'Creator';
    const handle = p.handle || (meta.author_url ? '@' + String(meta.author_url).split('/').filter(Boolean).pop().replace(/^@/, '') : '');
    const ref = { id: v.id, name: v.name, hood: v.hood, instagram: v.instagram, website: v.website, chef: v.chef };
    if (!R.isThirdParty(ref, creator) || (handle && !R.isThirdParty(ref, handle))) {
      dropped.push([c.url, 'posted by the venue / its chef']);
      continue;
    }
    out.push({
      id: p.platform + ':' + p.embedId,
      placeId: v.id,
      platform: p.platform,
      creator,
      handle,
      caption: strip(meta.title) || c.note || '',
      sourceUrl: c.url,
      embedId: p.embedId,
      thumb: meta.thumbnail_url || (p.platform === 'youtube' ? `https://i.ytimg.com/vi/${p.embedId}/hqdefault.jpg` : undefined),
      vertical: p.short || p.platform === 'tiktok' || p.platform === 'instagram' || (meta.height && meta.width && meta.height > meta.width) || undefined,
      views: 0,
      likes: 0,
      durationSec: 0,
      hd: false,
      score: 3, // hand-picked
      scope: 'venue',
      via: 'curated',
    });
  }
  return { out, dropped };
}

// ── 2. Dailymotion ───────────────────────────────────────────────────────────

async function dailymotion(R, venues) {
  const out = [];
  let calls = 0;
  for (const v of venues) {
    const ref = { id: v.id, name: v.name, hood: v.hood, instagram: v.instagram, website: v.website, chef: v.chef };
    const fields = 'id,title,description,owner.screenname,owner.username,duration,views_total,thumbnail_720_url,created_time,allow_embed,private,height,width';
    const d = await getJson(`https://api.dailymotion.com/videos?search=${encodeURIComponent(`"${v.name}" mexico`)}&fields=${fields}&limit=10&sort=relevance`);
    calls++;
    await sleep(350);
    for (const x of d?.list || []) {
      if (!x.allow_embed || x.private) continue;
      if (x.duration < 10 || x.duration > 1800) continue;
      const item = { title: x.title || '', description: x.description || '', tags: [] };
      if (!R.isAboutVenue(ref, item)) continue;
      const creator = x['owner.screenname'] || x['owner.username'] || 'Dailymotion creator';
      if (!R.isThirdParty(ref, creator) || !R.isThirdParty(ref, x['owner.username'] || '')) continue;
      out.push({
        id: 'dailymotion:' + x.id,
        placeId: v.id,
        platform: 'dailymotion',
        creator,
        handle: '@' + (x['owner.username'] || ''),
        caption: x.title,
        sourceUrl: `https://www.dailymotion.com/video/${x.id}`,
        embedId: x.id,
        thumb: x.thumbnail_720_url,
        publishedAt: x.created_time ? new Date(x.created_time * 1000).toISOString() : undefined,
        vertical: x.height > x.width || undefined,
        views: x.views_total || 0,
        likes: 0,
        durationSec: x.duration,
        hd: (x.height || 0) >= 720,
        score: Math.log10((x.views_total || 0) + 1) + ((x.height || 0) >= 720 ? 0.5 : 0),
        scope: 'venue',
        via: 'dailymotion',
      });
    }
  }
  return { out, calls };
}

// ── 3./4. Commons + Internet Archive (files played natively) ────────────────

/** Signature dishes worth a related clip, from the guide's own dish list / category. */
const DISHES = [
  ['al pastor', /pastor/],
  ['suadero', /suadero/],
  ['mole', /\bmole\b/],
  ['tostada', /tostada/],
  ['tamales', /tamal/],
  ['pozole', /pozole/],
  ['birria', /birria/],
  ['barbacoa', /barbacoa/],
  ['carnitas', /carnitas/],
  ['churros', /churro/],
  ['pan dulce', /concha|pan dulce|panader/],
  ['tlacoyo', /tlacoyo/],
  ['quesadilla', /quesadilla/],
  ['ceviche', /ceviche|aguachile/],
  ['tortillas', /tortilla|nixtamal|maiz|maíz|masa/],
  ['tacos', /taco|taquer/],
  ['mezcal', /mezcal/],
];
const MEX = /mexic|méxic|cdmx|ciudad de mexico|mexico city|oaxaca|puebla/i;

function dishesOf(v) {
  const text = fold([...(v.dishes || []), v.category, v.cuisine, v.name].join(' '));
  return DISHES.filter(([, re]) => re.test(text)).map(([k]) => k).slice(0, 2);
}

const cache = {};
async function commonsSearch(q) {
  if (cache['c:' + q]) return cache['c:' + q];
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12' +
    `&gsrsearch=${encodeURIComponent(q + ' filetype:video')}` +
    '&prop=videoinfo&viprop=url|mime|size|mediatype|extmetadata|derivatives&viurlwidth=640';
  const d = await getJson(url);
  await sleep(250);
  const res = [];
  for (const p of Object.values(d?.query?.pages || {})) {
    const vi = (p.videoinfo || [])[0];
    if (!vi || !/^video\/|application\/ogg/.test(vi.mime || '')) continue;
    const ders = (vi.derivatives || []).filter((x) => x.src);
    const pick =
      ders.find((x) => /mp4/.test(x.type || '') && (x.height || 0) <= 720) ||
      ders.filter((x) => /webm/.test(x.type || '') && (x.height || 0) <= 720).sort((a, b) => (b.height || 0) - (a.height || 0))[0] ||
      { src: vi.url, type: vi.mime, height: 0 };
    const em = vi.extmetadata || {};
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    res.push({
      key: 'commons:' + crypto.createHash('sha1').update(p.title).digest('hex').slice(0, 12),
      title,
      description: strip(em.ImageDescription?.value),
      creator: strip(em.Artist?.value) || 'Wikimedia Commons contributor',
      license: strip(em.LicenseShortName?.value),
      src: pick.src,
      mime: pick.type || vi.mime,
      hd: (pick.height || 0) >= 720,
      thumb: vi.thumburl,
      page: vi.descriptionurl,
      date: strip(em.DateTimeOriginal?.value),
    });
  }
  return (cache['c:' + q] = res);
}

async function archiveSearch(q) {
  if (cache['a:' + q]) return cache['a:' + q];
  const query = `(title:(${q}) OR subject:(${q}) OR description:(${q})) AND mediatype:movies`;
  const fl = ['identifier', 'title', 'creator', 'description', 'downloads', 'licenseurl', 'publicdate'].map((f) => 'fl[]=' + f).join('&');
  const d = await getJson(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&${fl}&rows=4&sort[]=downloads+desc&output=json`);
  await sleep(300);
  const res = [];
  for (const doc of d?.response?.docs || []) {
    const md = await getJson(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`);
    await sleep(300);
    const files = (md?.files || []).filter((f) => /\.mp4$/i.test(f.name || '') || /h\.264|mpeg4/i.test(f.format || ''));
    if (!files.length) continue;
    const f = files.sort((a, b) => (+a.size || 9e12) - (+b.size || 9e12)).find((x) => (+x.size || 0) > 200000) || files[0];
    const len = String(f.length || '');
    const secs = len.includes(':') ? len.split(':').reduce((s, n) => s * 60 + +n, 0) : +len || 0;
    if (secs && secs > 1800) continue;
    res.push({
      key: 'archive:' + doc.identifier,
      title: strip(doc.title),
      description: strip(Array.isArray(doc.description) ? doc.description.join(' ') : doc.description),
      creator: strip(Array.isArray(doc.creator) ? doc.creator[0] : doc.creator) || 'Internet Archive uploader',
      license: doc.licenseurl ? 'licence: ' + doc.licenseurl : '',
      src: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      mime: 'video/mp4',
      hd: (+f.height || 0) >= 720,
      thumb: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
      page: `https://archive.org/details/${doc.identifier}`,
      durationSec: secs,
      downloads: +doc.downloads || 0,
    });
  }
  return (cache['a:' + q] = res);
}

function fileClip(v, f, scope, relatedTo, source) {
  return {
    id: f.key,
    placeId: v.id,
    platform: source,
    creator: f.creator,
    handle: '',
    caption: f.title,
    sourceUrl: f.page,
    src: f.src,
    mime: f.mime,
    thumb: f.thumb,
    license: f.license || undefined,
    views: f.downloads || 0,
    likes: 0,
    durationSec: f.durationSec || 0,
    hd: !!f.hd,
    score: (scope === 'venue' ? 2.5 : scope === 'dish' ? 1 : 0.6) + Math.log10((f.downloads || 0) + 1) * 0.2,
    scope,
    relatedTo: relatedTo || undefined,
    via: source,
  };
}

/** Wall-clock budget for the file searches, so a slow archive never stalls the deploy. */
const FILE_BUDGET_MS = Number(process.env.FILE_BUDGET_S || 420) * 1000;

async function openFiles(R, venues) {
  const out = [];
  const t0 = Date.now();
  for (const v of venues) {
    if (Date.now() - t0 > FILE_BUDGET_MS) {
      console.log(`  file budget spent after ${venues.indexOf(v)} venues`);
      break;
    }
    const ref = { id: v.id, name: v.name, hood: v.hood, instagram: v.instagram, website: v.website, chef: v.chef };
    const mine = [];
    // about the venue itself
    for (const [src, search] of [['commons', commonsSearch], ['archive', archiveSearch]]) {
      for (const f of await search(`"${v.name}"`)) {
        if (R.isAboutVenue(ref, { title: f.title, description: f.description, tags: [] })) mine.push(fileClip(v, f, 'venue', '', src));
      }
    }
    // its signature dishes (related, clearly labelled)
    for (const dish of dishesOf(v)) {
      if (mine.filter((c) => c.scope === 'dish').length >= 2) break;
      for (const [src, search] of [['commons', commonsSearch], ['archive', archiveSearch]]) {
        const hits = (await search(`"${dish}"`)).filter((f) => fold(f.title + ' ' + f.description).includes(fold(dish).split(' ')[0]) && MEX.test(f.title + ' ' + f.description));
        if (hits[0]) mine.push(fileClip(v, hits[0], 'dish', dish, src));
        if (mine.filter((c) => c.scope === 'dish').length >= 2) break;
      }
    }
    // its neighbourhood (related)
    if (v.hood && mine.length < 2) {
      const hits = (await commonsSearch(`"${v.hood}" "Ciudad de México"`)).concat(await commonsSearch(`"${v.hood}" Mexico City`));
      const f = hits.find((x) => fold(x.title + ' ' + x.description).includes(fold(v.hood)));
      if (f) mine.push(fileClip(v, f, 'area', v.hood, 'commons'));
    }
    out.push(...mine);
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────

async function main() {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const curatedHash = crypto.createHash('sha1').update(fs.readFileSync(CURATED)).digest('hex').slice(0, 12);
  const since = (Date.now() - Date.parse(prev.generatedAt || 0)) / 36e5;
  if (!process.env.FORCE && since < MIN_GAP_HOURS && prev.curatedHash === curatedHash) {
    console.log(`open clips collected ${since.toFixed(1)} h ago — skipping (FORCE=1 to override)`);
    return;
  }
  const R = loadRules();
  const venues = readVenues().sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0));
  const venueById = { ...SEED_VENUES };
  venues.forEach((v) => (venueById[v.id] = v));

  const t0 = Date.now();
  const cur = await curated(R, venueById);
  console.log(`curated: ${cur.out.length} kept, ${cur.dropped.length} dropped`);
  cur.dropped.forEach(([u, why]) => console.log('  dropped', u, '—', why));
  const dm = await dailymotion(R, venues);
  console.log(`dailymotion: ${dm.out.length} clips from ${dm.calls} searches`);
  const files = await openFiles(R, venues.slice(0, Number(process.env.FILE_VENUES || 90)));
  console.log(`commons + archive: ${files.length} file clips`);

  const venuesOut = {};
  const seen = new Set();
  for (const c of [...cur.out, ...dm.out, ...files]) {
    const k = c.placeId + '|' + c.id;
    if (seen.has(k)) continue;
    seen.add(k);
    (venuesOut[c.placeId] = venuesOut[c.placeId] || { clips: [] }).clips.push(c);
  }
  for (const v of Object.values(venuesOut)) v.clips.sort((a, b) => b.score - a.score).splice(10);
  const count = (pred) => Object.values(venuesOut).reduce((n, v) => n + v.clips.filter(pred).length, 0);
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    curatedHash,
    took: Math.round((Date.now() - t0) / 1000) + 's',
    totals: {
      venues: Object.keys(venuesOut).length,
      clips: count(() => true),
      byPlatform: ['youtube', 'tiktok', 'instagram', 'vimeo', 'dailymotion', 'commons', 'archive'].reduce((o, p) => ((o[p] = count((c) => c.platform === p)), o), {}),
      aboutVenue: count((c) => c.scope === 'venue'),
      related: count((c) => c.scope !== 'venue'),
    },
    dropped: cur.dropped.map(([url, why]) => ({ url, why })),
    venues: venuesOut,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', OUT, JSON.stringify(out.totals));
}

main().catch((e) => {
  console.error('collect-clips-open failed:', e);
  process.exit(1);
});
