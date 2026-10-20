/**
 * The trial backend, from the app's side — real users and their data.
 *
 * Every person is a real Supabase Auth user. A device signs in anonymously the
 * moment someone makes a passport (no form, no password); "Continue with
 * Google" gives them the same account on any device. Everything they do — their
 * ranked list, want-to-try, follows, favourites, reviews — is written under
 * that user (row-level security only lets them write their own rows), and read
 * back on every launch, so each use starts from their latest state.
 *
 * Plain fetch against Supabase's REST endpoints (no SDK), so web and native
 * behave the same. Every call is best-effort: offline, unconfigured, or with
 * the backend not built yet, the app keeps working on the device and catches
 * up next time. See supabase/migrations/0002_trial.sql and TRIAL_RUN.md.
 */
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import type { Session } from './auth';
import type { Place } from '../store/data';

/** The build this is (stamped by CI), shown in Settings and sent with reports. */
export const APP_VERSION: string = process.env.EXPO_PUBLIC_BUILD || 'dev';

export const cloudConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// ── session ─────────────────────────────────────────────────────────────────

export type CloudState = 'off' | 'connecting' | 'synced' | 'local' | 'offline';

let session: Session | null = null;
let state: CloudState = cloudConfigured() ? 'connecting' : 'off';
let stateNote = '';
const sessionListeners = new Set<(s: Session | null) => void>();
const stateListeners = new Set<(s: CloudState, note: string) => void>();

export const currentSession = () => session;
export const cloudState = () => ({ state, note: stateNote });

export function setSession(s: Session | null): void {
  session = s;
  sessionListeners.forEach((f) => f(s));
}
export function onSessionChange(f: (s: Session | null) => void): () => void {
  sessionListeners.add(f);
  return () => sessionListeners.delete(f);
}
export function setCloudState(s: CloudState, note = ''): void {
  if (s === state && note === stateNote) return;
  state = s;
  stateNote = note;
  stateListeners.forEach((f) => f(s, note));
}
export function onCloudState(f: (s: CloudState, note: string) => void): () => void {
  stateListeners.add(f);
  return () => stateListeners.delete(f);
}

function baseHeaders(token?: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', ...extra };
}

export async function timed(url: string, init: RequestInit = {}, ms = 9000): Promise<Response | null> {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(url, { ...init, signal: ctl.signal });
    clearTimeout(to);
    return r;
  } catch {
    return null;
  }
}

/** A valid access token, refreshing the session when it's about to expire. */
export async function accessToken(): Promise<string | null> {
  if (!session) return null;
  if (session.expires_at > Date.now() + 60_000) return session.access_token;
  const r = await timed(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!r || !r.ok) return null;
  const d = await r.json();
  if (!d.access_token) return null;
  setSession({ ...session, access_token: d.access_token, refresh_token: d.refresh_token || session.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000 });
  return session!.access_token;
}

/** Authenticated headers for a write (null when there's no signed-in user). */
export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string> | null> {
  const t = await accessToken();
  return t ? baseHeaders(t, extra) : null;
}

/** Headers for a public read: the user's token when there is one, else the public key. */
export async function readHeaders(): Promise<Record<string, string>> {
  return baseHeaders((await accessToken()) || undefined);
}

/**
 * Make this device a real user without asking anything: an anonymous Supabase
 * sign-in. Returns null when the project hasn't enabled anonymous sign-ins yet
 * (the app then stays local-only and says so in Settings).
 */
export async function signInAnonymously(): Promise<Session | null> {
  if (!cloudConfigured()) return null;
  const r = await timed(`${SUPABASE_URL}/auth/v1/signup`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify({ data: {} }) });
  if (!r) {
    setCloudState('offline', 'Can’t reach the server — saved on this device.');
    return null;
  }
  if (!r.ok) {
    setCloudState('local', 'Accounts aren’t open on the server yet — saved on this device.');
    return null;
  }
  const d = await r.json();
  if (!d.access_token || !d.user?.id) return null;
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: Date.now() + (d.expires_in || 3600) * 1000,
    user: { id: d.user.id, email: '', name: '', anonymous: true },
  };
}

// ── generic REST helpers ────────────────────────────────────────────────────

async function rest(path: string, init: RequestInit & { auth?: boolean; prefer?: string } = {}): Promise<Response | null> {
  if (!cloudConfigured()) return null;
  const h = init.auth === false ? baseHeaders() : await authHeaders(init.prefer ? { Prefer: init.prefer } : {});
  if (!h) return null;
  if (init.auth === false && init.prefer) h.Prefer = init.prefer;
  return timed(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: h });
}

async function rows<T>(path: string, auth = true): Promise<T[] | null> {
  const r = auth ? await rest(path) : await timed(`${SUPABASE_URL}/rest/v1/${path}`, { headers: await readHeaders() });
  if (!r || !r.ok) return null;
  const d = await r.json();
  return Array.isArray(d) ? (d as T[]) : null;
}

const inList = (ids: string[]) => `(${ids.map((i) => `"${i.replace(/"/g, '')}"`).join(',')})`;

// ── the person's own data ───────────────────────────────────────────────────

export type RankRow = { place_id: string; place_name: string | null; score: number | null; position: number | null; category: string | null; updated_at?: string };

/** What the server holds for this user (null = couldn't ask). */
export async function pullMine(): Promise<{ rankings: RankRow[]; wants: string[]; follows: string[] } | null> {
  const uid = session?.user.id;
  if (!uid) return null;
  const [rk, wa, fo] = await Promise.all([
    rows<RankRow>(`rankings?user_id=eq.${uid}&select=place_id,place_name,score,position,category,updated_at&order=position.asc`),
    rows<{ place_id: string }>(`wants?user_id=eq.${uid}&select=place_id`),
    rows<{ followee: string }>(`follows?user_id=eq.${uid}&select=followee`),
  ]);
  if (!rk || !wa || !fo) return null;
  return { rankings: rk, wants: wa.map((w) => w.place_id), follows: fo.map((f) => f.followee) };
}

export type MineSnapshot = { ranked: Place[]; wantIds: string[]; follows: string[] };
let lastPushed: { rank: Map<string, string>; wants: Set<string>; follows: Set<string> } | null = null;

/** Seed the "already on the server" view after a pull, so the next push only sends changes. */
export function markSynced(m: { rankings: RankRow[]; wants: string[]; follows: string[] }): void {
  lastPushed = {
    rank: new Map(m.rankings.map((r) => [r.place_id, `${r.score}|${r.position}`])),
    wants: new Set(m.wants),
    follows: new Set(m.follows),
  };
}

/**
 * Push what changed since the last sync: upsert moved/rescored rankings, delete
 * removed ones, and the same for want-to-try and follows. True when the server
 * is up to date.
 */
export async function pushMine(m: MineSnapshot, categoryOf: (p: Place) => string): Promise<boolean> {
  const uid = session?.user.id;
  if (!uid) return false;
  const prev = lastPushed || { rank: new Map<string, string>(), wants: new Set<string>(), follows: new Set<string>() };
  const ok: boolean[] = [];

  const now = new Map(m.ranked.map((p, i) => [p.id, { p, sig: `${p.score ?? null}|${i}`, i }]));
  const up = [...now.values()].filter((x) => prev.rank.get(x.p.id) !== x.sig);
  if (up.length) {
    const r = await rest('rankings?on_conflict=user_id,place_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(up.map((x) => ({ user_id: uid, place_id: x.p.id, place_name: x.p.name, score: x.p.score ?? null, position: x.i, category: categoryOf(x.p), updated_at: new Date().toISOString() }))),
    });
    ok.push(!!r?.ok);
  }
  const gone = [...prev.rank.keys()].filter((id) => !now.has(id));
  if (gone.length) ok.push(!!(await rest(`rankings?user_id=eq.${uid}&place_id=in.${encodeURIComponent(inList(gone))}`, { method: 'DELETE' }))?.ok);

  const wAdd = m.wantIds.filter((id) => !prev.wants.has(id));
  const wDel = [...prev.wants].filter((id) => !m.wantIds.includes(id));
  if (wAdd.length) ok.push(!!(await rest('wants?on_conflict=user_id,place_id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: JSON.stringify(wAdd.map((place_id) => ({ user_id: uid, place_id }))) }))?.ok);
  if (wDel.length) ok.push(!!(await rest(`wants?user_id=eq.${uid}&place_id=in.${encodeURIComponent(inList(wDel))}`, { method: 'DELETE' }))?.ok);

  const fAdd = m.follows.filter((h) => !prev.follows.has(h));
  const fDel = [...prev.follows].filter((h) => !m.follows.includes(h));
  if (fAdd.length) ok.push(!!(await rest('follows?on_conflict=user_id,followee', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: JSON.stringify(fAdd.map((followee) => ({ user_id: uid, followee }))) }))?.ok);
  if (fDel.length) ok.push(!!(await rest(`follows?user_id=eq.${uid}&followee=in.${encodeURIComponent(inList(fDel))}`, { method: 'DELETE' }))?.ok);

  const allOk = ok.every(Boolean);
  if (allOk) {
    lastPushed = { rank: new Map([...now.values()].map((x) => [x.p.id, x.sig])), wants: new Set(m.wantIds), follows: new Set(m.follows) };
  }
  return allOk;
}

/** Count today's open (and refresh "last seen"). */
export async function touchSession(): Promise<void> {
  await rest('rpc/touch_session', { method: 'POST', body: JSON.stringify({ p_version: APP_VERSION }) });
}

/** Someone else's public ranked list, by their user id (for their profile). */
export async function fetchRankingsOf(userId: string): Promise<RankRow[]> {
  return (await rows<RankRow>(`rankings?user_id=eq.${userId}&select=place_id,place_name,score,position,category&order=position.asc&limit=200`, false)) || [];
}

/** How many real people have this place on their list, and their average score. */
export async function placeCommunity(placeId: string): Promise<{ count: number; avg: number | null }> {
  const r = await rows<{ score: number | null }>(`rankings?place_id=eq.${encodeURIComponent(placeId)}&select=score&limit=500`, false);
  if (!r || !r.length) return { count: 0, avg: null };
  const s = r.map((x) => Number(x.score)).filter((n) => Number.isFinite(n));
  return { count: r.length, avg: s.length ? s.reduce((a, b) => a + b, 0) / s.length : null };
}

// ── the community: real people ──────────────────────────────────────────────

export type PublicPerson = { handle: string; name: string; initials: string | null; color: string | null; avatar_url: string | null; user_id: string | null; last_seen_at: string | null; city_id: string | null };
const PERSON_COLS = 'handle,name,initials,color,avatar_url,user_id,last_seen_at,city_id';

/** The most recently active people on the trial (newest first). */
export async function fetchPeople(limit = 40): Promise<PublicPerson[]> {
  return (await rows<PublicPerson>(`profiles?select=${PERSON_COLS}&user_id=not.is.null&order=last_seen_at.desc.nullslast&limit=${limit}`, false)) || [];
}

export type TrialStats = { people: number; active_today: number; active_7d: number; rankings: number; reviews: number; suggestions: number; as_of: string };
export async function fetchTrialStats(): Promise<TrialStats | null> {
  if (!cloudConfigured()) return null;
  const r = await timed(`${SUPABASE_URL}/rest/v1/rpc/trial_stats`, { method: 'POST', headers: await readHeaders(), body: '{}' });
  if (!r || !r.ok) return null;
  return (await r.json()) as TrialStats;
}

// ── telling us things: new spots, feedback, crashes ─────────────────────────

export type SpotSuggestion = { kind: 'new' | 'closed' | 'moved' | 'photo'; name: string; placeId?: string; lat?: number; lon?: number; hood?: string; link?: string; note?: string; handle?: string; cityId?: string };

export async function suggestSpot(s: SpotSuggestion): Promise<boolean> {
  const uid = session?.user.id;
  if (!uid) return false;
  const r = await rest('spot_suggestions', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ user_id: uid, kind: s.kind, name: s.name.slice(0, 120), place_id: s.placeId ?? null, lat: s.lat ?? null, lon: s.lon ?? null, hood: s.hood ?? null, link: s.link ?? null, note: s.note ? s.note.slice(0, 500) : null, handle: s.handle ?? null, city_id: s.cityId || 'cdmx' }),
  });
  return !!r?.ok;
}

/** Recent spots people told us about (shown as "found by diners" until the next sweep folds them in). */
export async function fetchSuggestions(limit = 30): Promise<(SpotSuggestion & { created_at: string })[]> {
  const r = await rows<any>(`spot_suggestions?select=kind,name,place_id,lat,lon,hood,link,note,handle,city_id,created_at&kind=eq.new&order=created_at.desc&limit=${limit}`, false);
  return (r || []).map((x) => ({ kind: x.kind, name: x.name, placeId: x.place_id ?? undefined, lat: x.lat ?? undefined, lon: x.lon ?? undefined, hood: x.hood ?? undefined, link: x.link ?? undefined, note: x.note ?? undefined, handle: x.handle ?? undefined, cityId: x.city_id ?? undefined, created_at: x.created_at }));
}

export async function sendFeedback(text: string, screen: string, handle?: string): Promise<boolean> {
  const uid = session?.user.id;
  if (!uid || !text.trim()) return false;
  const r = await rest('feedback', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ user_id: uid, text: text.trim().slice(0, 2000), screen, handle: handle ?? null, app_version: APP_VERSION }) });
  return !!r?.ok;
}

let reported = 0;
/** Report a crash (at most 5 per session; works signed-in or not). */
export async function reportError(err: unknown, screen?: string): Promise<void> {
  if (!cloudConfigured() || reported >= 5) return;
  reported++;
  const e = err as { message?: string; stack?: string };
  const ua = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : Platform.OS;
  await timed(`${SUPABASE_URL}/rest/v1/client_errors`, {
    method: 'POST',
    headers: { ...(await readHeaders()), Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: session?.user.id ?? null,
      message: String(e?.message || err).slice(0, 1000),
      stack: e?.stack ? String(e.stack).slice(0, 6000) : null,
      screen: screen ?? null,
      app_version: APP_VERSION,
      user_agent: String(ua).slice(0, 300),
    }),
  });
}
