#!/usr/bin/env node
/**
 * Backend for the trial run — check it, and (with an access token) build it.
 *
 *   node scripts/backend.mjs            probe only: what the public app can see
 *   SUPABASE_ACCESS_TOKEN=… node …      also apply every migration in
 *                                       supabase/migrations (in order, all
 *                                       idempotent) and turn on the auth
 *                                       settings the app needs
 *
 * The project URL + public key come from src/config.ts (the same ones the app
 * ships). The access token is a Supabase personal access token (Dashboard →
 * Account → Access Tokens), stored as the repo secret SUPABASE_ACCESS_TOKEN —
 * never in the code. Writes supabase/status.json with what it found.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cfg = fs.readFileSync(path.join(ROOT, 'src/config.ts'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const KEY = (cfg.match(/SUPABASE_ANON_KEY\s*=\s*\n?\s*'([^']+)'/) || [])[1];
const REF = URL_ ? new URL(URL_).hostname.split('.')[0] : null;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const SITE = process.env.SITE_URL || 'https://juanctame.github.io/NMC-/';

if (!URL_ || !KEY) {
  console.log('Supabase is not configured in src/config.ts — nothing to do.');
  process.exit(0);
}

const out = { checked_at: new Date().toISOString(), project: REF, managed: !!TOKEN, migrations: [], auth: {}, tables: {}, stats: null, notes: [] };
const anonH = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const api = (p, init = {}) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}${p}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function json(r) {
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

// ── 1. build: migrations + auth settings (only with a token) ────────────────
if (TOKEN) {
  const files = fs
    .readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8');
    const r = await api('/database/query', { method: 'POST', body: JSON.stringify({ query: sql }) });
    const body = r.ok ? null : await json(r);
    out.migrations.push({ file: f, ok: r.ok, status: r.status, error: body ? JSON.stringify(body).slice(0, 400) : undefined });
    console.log(`migration ${f}: ${r.ok ? 'applied' : 'FAILED ' + r.status + ' ' + JSON.stringify(body).slice(0, 400)}`);
  }
  // Auth: anonymous sign-ins (every device is a real user from its first
  // launch), and the site URL / redirect allow-list for Google sign-in.
  const cur = await api('/config/auth');
  if (cur.ok) {
    const c = await json(cur);
    const allow = new Set(String(c.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean));
    allow.add(SITE);
    allow.add(SITE + '**');
    const patch = { external_anonymous_users_enabled: true, uri_allow_list: [...allow].join(',') };
    if (!c.site_url || /localhost/.test(c.site_url)) patch.site_url = SITE;
    const r = await api('/config/auth', { method: 'PATCH', body: JSON.stringify(patch) });
    out.notes.push(r.ok ? 'auth settings updated (anonymous sign-ins on, redirect URLs set)' : `auth settings update failed (${r.status}): ${JSON.stringify(await json(r)).slice(0, 300)}`);
  } else {
    out.notes.push(`could not read auth settings (${cur.status}) — check the token has access to project ${REF}`);
  }
} else {
  out.notes.push('No SUPABASE_ACCESS_TOKEN secret: probed only. Add it to apply the migrations and auth settings automatically (TRIAL_RUN.md).');
}

// ── 2. probe: what the public app sees ──────────────────────────────────────
try {
  const r = await fetch(`${URL_}/auth/v1/settings`, { headers: anonH });
  const s = await json(r);
  out.auth = { reachable: r.ok, anonymous_sign_ins: !!s?.external?.anonymous_users, google: !!s?.external?.google, signups_disabled: !!s?.disable_signup };
} catch (e) {
  out.auth = { reachable: false, error: String(e).slice(0, 200) };
}

const TABLES = {
  profiles: 'handle',
  reviews: 'id',
  favorites: 'id',
  rankings: 'place_id',
  wants: 'place_id',
  follows: 'followee',
  spot_suggestions: 'id',
  places: 'id',
};
for (const [t, col] of Object.entries(TABLES)) {
  try {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=${col}&limit=1`, { headers: { ...anonH, Prefer: 'count=exact' } });
    const range = r.headers.get('content-range') || '';
    const total = range.includes('/') ? range.split('/')[1] : null;
    out.tables[t] = r.ok ? { ok: true, rows: total === '*' ? null : Number(total) } : { ok: false, status: r.status, error: JSON.stringify(await json(r)).slice(0, 160) };
  } catch (e) {
    out.tables[t] = { ok: false, error: String(e).slice(0, 160) };
  }
}
try {
  const r = await fetch(`${URL_}/rest/v1/rpc/trial_stats`, { method: 'POST', headers: { ...anonH, 'Content-Type': 'application/json' }, body: '{}' });
  out.stats = r.ok ? await json(r) : null;
} catch {
  out.stats = null;
}

const missing = Object.entries(out.tables).filter(([, v]) => !v.ok).map(([k]) => k);
out.ready = out.auth.reachable && out.auth.anonymous_sign_ins && missing.length === 0;
if (missing.length) out.notes.push(`missing or unreadable: ${missing.join(', ')}`);
if (out.auth.reachable && !out.auth.anonymous_sign_ins) out.notes.push('anonymous sign-ins are off — new visitors stay local-only until they are on');

fs.writeFileSync(path.join(ROOT, 'supabase/status.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
// A failed migration fails the job; a not-yet-built backend does not.
if (out.migrations.some((m) => !m.ok)) process.exit(1);
