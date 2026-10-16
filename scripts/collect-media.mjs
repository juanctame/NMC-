#!/usr/bin/env node
/**
 * Collect link-preview media for every curated CDMX venue.
 *
 * For each restaurant we visit its official website and the guide / press pages
 * the dataset cites (Guía Michelin, Chilango, Time Out, El Financiero, …) and
 * read the preview each page publishes for sharing (og:image / twitter:image,
 * og:title). We store only the image URL + credit + link — nothing is
 * downloaded or re-hosted; the app shows them as attributed link previews.
 *
 * A page is "specific" when it is about this venue (e.g. its Michelin listing);
 * roundup articles are kept as press mentions, but their image is never used as
 * the venue's own photo (it may show a different restaurant).
 *
 * v4 — every picture we can find, sorted by who took it:
 *  - the restaurant's own (brand) photos: every real photo on its website —
 *    the home page plus its gallery / menu / about pages — not just the preview;
 *  - visitors' photos of the venue on Wikimedia Commons (freely licensed, with
 *    the author and licence), kept only when they are really about this venue
 *    (scripts/lib/relevance.mjs, the rule the clip collector uses);
 *  - guide / press preview images for pages about the venue.
 * Rate-limited sites (HTTP 429) are retried with back-off.
 *
 * Runs in GitHub Actions (the dev sandbox has no open internet). Output:
 * src/data/media.json. Skips work when the manifest is fresh unless FORCE=1.
 *
 *   node scripts/collect-media.mjs            # refresh if older than 7 days
 *   FORCE=1 node scripts/collect-media.mjs    # always refresh
 */
import fs from 'node:fs';
import { strictAbout, CDMX, ELSEWHERE, words } from './lib/relevance.mjs';

const CARTE = 'src/data/carte.ts';
const OUT = 'src/data/media.json';
const UA = 'Mozilla/5.0 (compatible; CRTQ-LinkPreview/1.0; +https://juanctame.github.io/NMC-/)';
const MAX_AGE_DAYS = 7;
const VERSION = 6; // bump when collection logic changes → forces a refresh
const SITE_PHOTOS = 12; // brand photos kept per restaurant
const VISITOR_PHOTOS = 6; // Commons photos kept per restaurant
const MIN_BYTES = 20000; // smaller than this is an icon / thumbnail, not a photo
const CONCURRENCY = 8;

function readVenues() {
  const t = fs.readFileSync(CARTE, 'utf8');
  const a = t.indexOf('= [', t.indexOf('const RAW')) + 2;
  return JSON.parse(t.slice(a, t.indexOf('\n];', a) + 2));
}

const deaccent = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (s) => deaccent(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Is this URL a page about this venue (vs. a roundup)? */
function isSpecific(url, name) {
  const s = slug(name);
  if (!s) return false;
  let path = '';
  try {
    path = deaccent(decodeURIComponent(new URL(url).pathname));
  } catch {
    return false;
  }
  return path
    .split('/')
    .filter(Boolean)
    .some(
      (seg) =>
        seg === s || seg.startsWith(s + '-') || seg.endsWith('-' + s) || seg.includes('-' + s + '-') || (s.length >= 6 && seg.includes(s)),
    );
}

const ENT = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'", '#x27': "'", '#038': '&' };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENT[e.toLowerCase()] ?? m).trim();

function metaTags(html) {
  const head = html.slice(0, 400000);
  const tags = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const a of m[0].matchAll(/([a-zA-Z_:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? '';
    }
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content && !tags[key]) tags[key] = decode(attrs.content);
  }
  const link = head.match(/<link\b[^>]*rel=["']image_src["'][^>]*>/i);
  if (link) {
    const href = link[0].match(/href=["']([^"']+)["']/i);
    if (href && !tags['image_src']) tags['image_src'] = decode(href[1]);
  }
  const title = head.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
  if (title) tags['html:title'] = decode(title[1]);
  return tags;
}

/** Images declared in JSON-LD structured data (many guide pages carry them). */
function jsonLdImages(html) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const img = n.image ?? n.photo ?? n.thumbnailUrl;
    for (const x of [].concat(img || [])) {
      if (typeof x === 'string') out.push(x);
      else if (x && typeof x === 'object') out.push(x.url || x.contentUrl);
    }
    for (const k of ['@graph', 'mainEntity', 'itemListElement']) walk(n[k]);
  };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {}
  }
  return out.filter((x) => typeof x === 'string' && x.length > 8);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** get(), retried with back-off when a site rate-limits us (429 / 503). */
async function getRetry(url, init = {}, ms = 15000) {
  let r;
  for (let i = 0; i < 3; i++) {
    r = await get(url, init, ms);
    if (r.status !== 429 && r.status !== 503) return r;
    try {
      await r.body?.cancel();
    } catch {}
    await sleep(6000 * (i + 1));
  }
  return r;
}

async function get(url, init = {}, ms = 15000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      ...init,
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8', ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(to);
  }
}

/** Confirm a URL actually serves an image (some og:image values are stale). */
async function imageCheck(url) {
  try {
    const r = await get(url, { headers: { Range: 'bytes=0-2047', Accept: 'image/*' } }, 12000);
    const type = r.headers.get('content-type') || '';
    try {
      await r.body?.cancel();
    } catch {}
    if (!(r.ok || r.status === 206)) return { ok: false, why: `HTTP ${r.status}` };
    if (!type.startsWith('image/') || type.includes('svg')) return { ok: false, why: `type ${type || 'none'}` };
    // Total size from Content-Range ("bytes 0-2047/183422") or Content-Length.
    const range = r.headers.get('content-range') || '';
    const bytes = +(range.split('/')[1] || (r.status === 200 ? r.headers.get('content-length') : 0) || 0);
    if (bytes && bytes < MIN_BYTES) return { ok: false, why: `too small (${bytes} B)` };
    return { ok: true, bytes };
  } catch (e) {
    return { ok: false, why: e.name === 'AbortError' ? 'timeout' : 'fetch error' };
  }
}

const NOT_A_PHOTO =
  /logo|favicon|placeholder|default[-_]?(image|og|share)|sprite|icon|avatar|\.svg(\?|$)|\.gif(\?|$)|dummy|preloader|loader|no-image|\/flags?\/|\/plugins\/|rubrica|firma|signature|[-_](white|blanco|negro|black|beige)[-_.]|elements?\.|elementos|fondo|pattern|textura|badge|sello|michelin\.|cropped-|recurso[-_ %0-9]*\.png/i;

/**
 * Photos embedded in a page's own markup — used only for a restaurant's own
 * website when it declares no preview image (single-page / Wix / Squarespace
 * sites): <img> src / lazy src / srcset, CSS background images, and image URLs
 * inside the page's data. Logos, icons and tracking pixels are skipped.
 */
function pageImages(html) {
  const out = [];
  const push = (u) => u && !u.startsWith('data:') && out.push(u.trim());
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const attr = (n) => (tag.match(new RegExp(n + '\\s*=\\s*["\']([^"\']+)["\']', 'i')) || [])[1];
    const set = attr('srcset') || attr('data-srcset');
    if (set) push(set.split(',').pop().trim().split(/\s+/)[0]);
    push(attr('data-src') || attr('data-lazy-src') || attr('src'));
  }
  for (const m of html.matchAll(/background(?:-image)?\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) push(m[1]);
  for (const m of html.matchAll(/https?:\/\/[^"'\s()<>\\]+?\.(?:jpe?g|webp)(?:\?[^"'\s()<>\\]*)?/gi)) push(m[0]);
  return out.filter((u) => !/pixel|facebook\.com\/tr|1x1|spacer|blank\.(gif|png)|gravatar/i.test(u));
}

/** Unfurl one page: its preview image (validated) and title, with diagnostics. */
async function unfurl(url, isSite = false) {
  try {
    const r = await getRetry(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    const html = r.ok ? await r.text() : '';
    const diag = { status: r.status, bytes: html.length };
    if (!r.ok) return { ok: false, diag };
    if (!(r.headers.get('content-type') || '').includes('html')) return { ok: false, diag: { ...diag, reason: 'not-html' } };
    const tags = metaTags(html);
    const raw = [
      tags['og:image:secure_url'],
      tags['og:image'],
      tags['twitter:image'],
      tags['twitter:image:src'],
      ...jsonLdImages(html),
      tags['image_src'],
      ...(isSite ? pageImages(html) : []),
    ].filter(Boolean);
    const candidates = [...new Set(raw.map((x) => { try { return new URL(x, r.url).href.replace(/^http:\/\//, 'https://'); } catch { return ''; } }).filter(Boolean))];
    const rejected = [];
    let image;
    for (const c of candidates.slice(0, isSite ? 10 : 5)) {
      if (NOT_A_PHOTO.test(c)) { rejected.push({ url: c, why: 'looks like a logo/icon' }); continue; }
      const check = await imageCheck(c);
      if (check.ok) { image = c; break; }
      rejected.push({ url: c, why: check.why });
    }
    const title = tags['og:title'] || tags['twitter:title'] || tags['html:title'];
    return {
      ok: true,
      image,
      title: title ? title.slice(0, 160) : undefined,
      diag: image ? undefined : { ...diag, title: tags['html:title']?.slice(0, 80), candidates: candidates.length, rejected },
    };
  } catch (e) {
    return { ok: false, diag: { status: e.name === 'AbortError' ? 'timeout' : String(e.message || 'error').slice(0, 80) } };
  }
}

// ── the restaurant's own photos: every real photo on its site ───────────────

const PAGE_RE = /galer|gallery|fotos|photos|imagenes|menu|carta|nosotros|about|historia|story|espacio|space|restaurante|restaurant|experienc|concepto/i;

/** WordPress / Wix / Squarespace serve one photo at many sizes: one key per photo. */
const variantKey = (u) =>
  u
    .replace(/(static\.wixstatic\.com\/media\/[^/]+)\/v1\/.*$/, '$1')
    .replace(/\?.*$/, '')
    .replace(/-(\d{2,4})x(\d{2,4})(?=\.\w+$)/, '')
    .replace(/-scaled(?=\.\w+$)/, '');
const bestVariant = (u) => {
  if (/static\.wixstatic\.com\/media\//.test(u)) return u.replace(/(static\.wixstatic\.com\/media\/[^/]+)\/v1\/.*$/, '$1');
  if (/squarespace-cdn\.com/.test(u)) return u.replace(/\?.*$/, '') + '?format=1500w';
  return u;
};
const sizeHint = (u) => {
  const m = /-(\d{2,4})x(\d{2,4})(?=\.\w+(\?|$))/.exec(u) || /\/(?:fill|fit)\/w_(\d+),h_(\d+)/.exec(u);
  return m ? [+m[1], +m[2]] : null;
};

async function fetchHtml(url) {
  try {
    const r = await getRetry(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    const ok = r.ok && (r.headers.get('content-type') || '').includes('html');
    return { ok, status: r.status, html: ok ? await r.text() : '', final: r.url || url };
  } catch (e) {
    // unreachable site (DNS, TLS, timeout): skip it, never the whole run
    return { ok: false, status: e?.name === 'AbortError' ? 'timeout' : String(e?.cause?.code || e?.message || 'error').slice(0, 60), html: '', final: url };
  }
}

/**
 * Harvest a restaurant's website: the preview image first (their chosen hero),
 * then every photo on the home page and on up to three of its gallery / menu /
 * about pages. Logos, icons and thumbnails are dropped; each photo is checked
 * to serve a real image. Returns up to SITE_PHOTOS, hero first.
 */
async function harvestSite(url) {
  const home = await fetchHtml(url);
  if (!home.ok) return { ok: false, diag: { status: home.status } };
  let host = '';
  try {
    host = new URL(home.final).hostname;
  } catch {}
  const tags = metaTags(home.html);
  const hero = [tags['og:image:secure_url'], tags['og:image'], tags['twitter:image'], tags['twitter:image:src'], ...jsonLdImages(home.html)].filter(Boolean);
  const raw = [...hero, ...pageImages(home.html)];
  const links = [];
  for (const m of home.html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], home.final);
      if (u.hostname === host && PAGE_RE.test(u.pathname) && !/\.(pdf|jpe?g|png|webp)$/i.test(u.pathname) && !links.includes(u.href)) links.push(u.href);
    } catch {}
  }
  for (const l of links.slice(0, 3)) {
    const pg = await fetchHtml(l);
    if (pg.ok) {
      const t = metaTags(pg.html);
      raw.push(...[t['og:image'], ...pageImages(pg.html)].filter(Boolean));
    }
  }
  const seen = new Set();
  const candidates = [];
  for (const x of raw) {
    let abs = '';
    try {
      abs = new URL(x, home.final).href;
      if (home.final.startsWith('https:')) abs = abs.replace(/^http:\/\//, 'https://'); // no mixed content
    } catch {
      continue;
    }
    const hint = sizeHint(abs);
    if (NOT_A_PHOTO.test(abs) || (hint && hint[0] < 300)) continue;
    const key = variantKey(abs);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(bestVariant(abs));
  }
  const images = [];
  const rejected = [];
  // Photos are JPEG / WebP; PNGs are mostly graphics, so they go last and must be big.
  const isPng = (u) => /\.png(\?|$)|~mv2\.png/i.test(u);
  candidates.sort((a, b) => Number(isPng(a)) - Number(isPng(b)));
  for (const c of candidates.slice(0, 30)) {
    if (images.length >= SITE_PHOTOS) break;
    const check = await imageCheck(c);
    const ok = check.ok && !(isPng(c) && (check.bytes || 0) < 150000);
    if (ok) images.push(c);
    else if (rejected.length < 8) rejected.push({ url: c, why: check.ok ? 'png graphic' : check.why });
  }
  const title = tags['og:title'] || tags['twitter:title'] || tags['html:title'];
  return {
    ok: true,
    images,
    title: title ? title.slice(0, 160) : undefined,
    diag: images.length ? undefined : { status: home.status, pages: 1 + Math.min(3, links.length), candidates: candidates.length, rejected },
  };
}

// ── visitors' photos: Wikimedia Commons ─────────────────────────────────────

const stripTags = (h) => decode(String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

async function commonsVisitorPhotos(v) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20' +
    `&gsrsearch=${encodeURIComponent(`"${v.name}" filetype:bitmap`)}` +
    '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1000';
  let d;
  try {
    const r = await getRetry(url, { headers: { Accept: 'application/json' } });
    d = r.ok ? await r.json() : null;
  } catch {
    d = null;
  }
  const out = [];
  for (const p of Object.values(d?.query?.pages || {})) {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime || '') || (ii.width || 0) < 600) continue;
    const em = ii.extmetadata || {};
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    const description = stripTags(em.ImageDescription?.value) + ' ' + stripTags(em.Categories?.value);
    if (!strictAbout(v, { title, description })) continue;
    // A photo of *this* venue is filed under Mexico City (or its neighbourhood); logos aren't photos.
    const ctx = ' ' + words(title + ' ' + description) + ' ';
    // ("Centro" alone is no evidence — every city has one.)
    const hoodCue = v.hood && v.hood !== 'Centro' && ctx.includes(' ' + words(v.hood) + ' ');
    if (!(CDMX.test(ctx) || hoodCue || /mexico city|ciudad de mexico/.test(ctx))) continue;
    if (ELSEWHERE.test(ctx) && !CDMX.test(ctx)) continue;
    if (/\blogo\b/i.test(title)) continue;
    out.push({
      url: ii.thumburl || ii.url,
      page: ii.descriptionurl,
      credit: stripTags(em.Artist?.value).slice(0, 80) || 'Wikimedia Commons contributor',
      license: stripTags(em.LicenseShortName?.value),
      title: title.slice(0, 120),
    });
    if (out.length >= VISITOR_PHOTOS) break;
  }
  return out;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

async function main() {
  const venues = readVenues();
  if (!process.env.FORCE && fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      const ageDays = (Date.now() - Date.parse(prev.generatedAt)) / 864e5;
      const covered = venues.every((v) => prev.venues && prev.venues[v.id]);
      if (prev.version === VERSION && ageDays < MAX_AGE_DAYS && covered) {
        console.log(`media.json is fresh (${ageDays.toFixed(1)} days) and covers all venues — skipping (FORCE=1 to refresh)`);
        return;
      }
    } catch {}
  }

  // Every page to unfurl, de-duplicated (roundups are shared by many venues).
  const pages = new Map();
  const out_diag = {};
  for (const v of venues) {
    if (v.website) pages.set(v.website, null);
    for (const s of v.sources || []) pages.set(s.url, null);
  }
  const siteUrls = new Set(venues.map((v) => v.website).filter(Boolean));
  siteUrls.forEach((u) => pages.delete(u)); // sites are harvested in full below
  const urls = [...pages.keys()];
  console.log(`unfurling ${urls.length} press pages for ${venues.length} venues…`);
  const results = await pool(urls, CONCURRENCY, async (u, k) => {
    const res = await unfurl(u, false);
    if (k % 25 === 0) console.log(`  ${k}/${urls.length}`);
    return res;
  });
  urls.forEach((u, k) => pages.set(u, results[k]));
  urls.forEach((u, k) => {
    if (results[k]?.diag) out_diag[u] = results[k].diag;
  });

  const siteList = [...siteUrls];
  console.log(`harvesting ${siteList.length} restaurant sites…`);
  const sites = await pool(siteList, CONCURRENCY, async (u, k) => {
    const res = await harvestSite(u);
    if (k % 20 === 0) console.log(`  site ${k}/${siteList.length}`);
    return res;
  });
  const siteBy = new Map();
  siteList.forEach((u, k) => {
    siteBy.set(u, sites[k]);
    if (sites[k]?.diag) out_diag[u] = sites[k].diag;
  });

  console.log('searching Wikimedia Commons for visitors\' photos…');
  const visitors = await pool(venues, 4, async (v) => {
    const res = await commonsVisitorPhotos(v);
    await sleep(150);
    return res;
  });

  const out = { version: VERSION, generatedAt: new Date().toISOString(), userAgent: UA, venues: {}, diagnostics: {} };
  const stats = { venues: venues.length, withPhoto: 0, sitePhotos: 0, siteImages: 0, visitorPhotos: 0, venuesWithVisitors: 0, specificPress: 0, pressCards: 0, failedPages: 0 };
  // A group's shared website (e.g. one domain for several venues) is the brand of all of them.
  venues.forEach((v, idx) => {
    const entry = { press: [] };
    const site = v.website && siteBy.get(v.website);
    if (site?.ok && site.images?.length) {
      let host = '';
      try {
        host = new URL(v.website).hostname.replace(/^www\./, '');
      } catch {}
      entry.site = { image: site.images[0], images: site.images, link: v.website, credit: host, title: site.title };
      stats.sitePhotos++;
      stats.siteImages += site.images.length;
    }
    if (visitors[idx]?.length) {
      entry.visitors = visitors[idx];
      stats.visitorPhotos += visitors[idx].length;
      stats.venuesWithVisitors++;
    }
    for (const s of v.sources || []) {
      const p = pages.get(s.url);
      if (!p?.ok) {
        stats.failedPages++;
        continue;
      }
      const specific = isSpecific(s.url, v.name);
      entry.press.push({ outlet: s.outlet, url: s.url, title: p.title, image: p.image, specific });
      stats.pressCards++;
      if (specific && p.image) stats.specificPress++;
    }
    if (entry.site || entry.visitors || entry.press.some((p) => p.specific && p.image)) stats.withPhoto++;
    out.venues[v.id] = entry;
  });
  out.stats = stats;
  out.diagnostics = out_diag;
  // A run that finds far less than the last one (network trouble) keeps the last manifest.
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const before = prev.stats?.withPhoto || 0;
    if (before && stats.withPhoto < before * 0.5) {
      console.log(`only ${stats.withPhoto} venues with photos vs ${before} last time — keeping the previous manifest`, JSON.stringify(stats));
      return;
    }
  } catch {}
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', OUT, JSON.stringify(stats));
}

export { harvestSite, commonsVisitorPhotos };

// Run when invoked directly (the functions above are importable for tests).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
