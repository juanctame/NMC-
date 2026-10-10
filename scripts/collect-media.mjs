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
 * Runs in GitHub Actions (the dev sandbox has no open internet). Output:
 * src/data/media.json. Skips work when the manifest is fresh unless FORCE=1.
 *
 *   node scripts/collect-media.mjs            # refresh if older than 7 days
 *   FORCE=1 node scripts/collect-media.mjs    # always refresh
 */
import fs from 'node:fs';

const CARTE = 'src/data/carte.ts';
const OUT = 'src/data/media.json';
const UA = 'Mozilla/5.0 (compatible; CRTQ-LinkPreview/1.0; +https://juanctame.github.io/NMC-/)';
const MAX_AGE_DAYS = 7;
const VERSION = 3; // bump when collection logic changes → forces a refresh
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
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e.name === 'AbortError' ? 'timeout' : 'fetch error' };
  }
}

const NOT_A_PHOTO = /logo|favicon|placeholder|default[-_]?(image|og|share)|sprite|icon|avatar|\.svg(\?|$)/i;

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
    const r = await get(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
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
  const urls = [...pages.keys()];
  console.log(`unfurling ${urls.length} pages for ${venues.length} venues…`);
  const siteUrls = new Set(venues.map((v) => v.website).filter(Boolean));
  const results = await pool(urls, CONCURRENCY, async (u, k) => {
    const res = await unfurl(u, siteUrls.has(u));
    if (k % 25 === 0) console.log(`  ${k}/${urls.length}`);
    return res;
  });
  urls.forEach((u, k) => pages.set(u, results[k]));
  urls.forEach((u, k) => {
    if (results[k]?.diag) out_diag[u] = results[k].diag;
  });

  const out = { version: VERSION, generatedAt: new Date().toISOString(), userAgent: UA, venues: {}, diagnostics: {} };
  const stats = { venues: venues.length, withPhoto: 0, sitePhotos: 0, specificPress: 0, pressCards: 0, failedPages: 0 };
  for (const v of venues) {
    const entry = { press: [] };
    const site = v.website && pages.get(v.website);
    if (site?.ok && site.image) {
      let host = '';
      try {
        host = new URL(v.website).hostname.replace(/^www\./, '');
      } catch {}
      entry.site = { image: site.image, link: v.website, credit: host, title: site.title };
      stats.sitePhotos++;
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
    if (entry.site || entry.press.some((p) => p.specific && p.image)) stats.withPhoto++;
    out.venues[v.id] = entry;
  }
  out.stats = stats;
  out.diagnostics = out_diag;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', OUT, JSON.stringify(stats));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
