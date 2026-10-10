#!/usr/bin/env node
/**
 * Collect creator clips for every curated CDMX venue from YouTube, by the
 * venue's hashtag / name, keeping only third-party, high-quality, embeddable
 * clips (rules in src/data/clipRank.ts — transpiled here so the app and CI share
 * them). Output: src/data/videos.json, which the app plays in-app.
 *
 * Quota: search.list costs 100 units; the free tier is 10,000/day. Each run
 * spends at most MAX_SEARCHES searches, works through never-searched venues
 * first, then the stalest (> 7 days), and runs at most once every ~20 h — so the
 * whole guide is covered over two days and refreshed weekly, on any deploy.
 *
 * Key: YOUTUBE_API_KEY env (a GitHub secret) if set, else the site's browser key
 * from src/config.ts. The YouTube Data API v3 must be enabled on its project.
 *
 *   node scripts/collect-videos.mjs           FORCE=1 to ignore the 20 h spacing
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const OUT = 'src/data/videos.json';
const MAX_SEARCHES = Number(process.env.MAX_SEARCHES || 85);
const STALE_DAYS = 7;
const MIN_GAP_HOURS = 20;
const API = 'https://www.googleapis.com/youtube/v3';

// Share the app's clip rules (TypeScript → CommonJS on the fly).
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

function apiKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const cfg = fs.readFileSync('src/config.ts', 'utf8');
  return (cfg.match(/GOOGLE_MAPS_API_KEY\s*=\s*'([^']+)'/) || [])[1] || '';
}

class ApiError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

async function yt(path, params) {
  const r = await fetch(`${API}/${path}?${new URLSearchParams(params)}`);
  const d = await r.json().catch(() => ({}));
  if (d.error) {
    const reason = d.error.errors?.[0]?.reason || d.error.status || 'error';
    throw new ApiError(reason, d.error.message || reason);
  }
  return d;
}

async function main() {
  const R = loadRules();
  const venues = readVenues();
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { venues: {} };
  prev.venues = prev.venues || {};

  const sinceLast = (Date.now() - Date.parse(prev.lastRun || 0)) / 36e5;
  if (!process.env.FORCE && sinceLast < MIN_GAP_HOURS) {
    console.log(`last clip run ${sinceLast.toFixed(1)} h ago — skipping (FORCE=1 to override)`);
    return;
  }
  const key = apiKey();
  const save = (status, note) => {
    // Only a real run (ok / quota spent) starts the ~20 h spacing; a disabled API
    // or missing key retries on the very next deploy.
    const ran = status === 'ok' || status === 'quota';
    const out = { version: 1, generatedAt: new Date().toISOString(), lastRun: ran ? new Date().toISOString() : prev.lastRun, status, note, venues: prev.venues };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
    console.log('wrote', OUT, status, note || '');
  };
  if (!key) return save('no-key', 'No YouTube API key configured');

  // Never-searched first (most acclaimed first), then the stalest.
  const now = Date.now();
  const queue = venues
    .map((v) => ({ v, at: Date.parse(prev.venues[v.id]?.searchedAt || 0) }))
    .filter(({ at }) => now - at > STALE_DAYS * 864e5)
    .sort((a, b) => a.at - b.at || (b.v.acclaim || 0) - (a.v.acclaim || 0))
    .slice(0, MAX_SEARCHES);
  console.log(`clip search for ${queue.length} venue(s) (budget ${MAX_SEARCHES})`);

  let status = 'ok';
  let note = '';
  let done = 0;
  for (const { v } of queue) {
    try {
      const s = await yt('search', {
        part: 'snippet',
        type: 'video',
        q: R.clipQuery(v),
        maxResults: '25',
        videoEmbeddable: 'true',
        safeSearch: 'moderate',
        regionCode: 'MX',
        relevanceLanguage: 'es',
        key,
      });
      const ids = (s.items || []).map((it) => it.id?.videoId).filter(Boolean);
      let details = [];
      if (ids.length) {
        const d = await yt('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(','), key });
        details = (d.items || []).map((it) => R.toYtVideo(it));
      }
      const clips = R.rankClips(v, details);
      prev.venues[v.id] = { searchedAt: new Date().toISOString(), clips };
      done++;
      if (done % 10 === 0) console.log(`  ${done}/${queue.length}`);
    } catch (e) {
      if (e instanceof ApiError) {
        status = e.reason === 'accessNotConfigured' || e.reason === 'SERVICE_DISABLED' ? 'api-disabled' : /quota/i.test(e.reason) ? 'quota' : e.reason;
        note = e.message.slice(0, 240);
        console.log(`stopping: ${status} — ${note}`);
        break;
      }
      console.log(`  ${v.name}: ${e.message}`);
    }
  }
  const withClips = Object.values(prev.venues).filter((x) => x.clips?.length).length;
  save(status, note || `${done} searched this run · ${withClips} venues with clips`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
