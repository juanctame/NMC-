/**
 * Central user directory (Supabase REST / PostgREST). This is the "users
 * database": every username created in the app is registered here, keyed by a
 * unique handle, so accounts live centrally instead of only on one device.
 * Each row belongs to a real signed-in user (anonymous on first launch, or
 * Google), so only its owner can change it; usernames stay unique across the
 * community.
 *
 * Uses plain fetch (no SDK) so it behaves identically on web and native, and
 * degrades to safe no-ops when SUPABASE_URL / SUPABASE_ANON_KEY are unset — the
 * app then runs local-only, exactly as before. See SHARED_DEMO.md for the SQL.
 */
import { SUPABASE_URL } from '../config';
import { sharedEnabled } from './shared';
import { authHeaders, currentSession, readHeaders } from './cloud';
import type { Profile, Role } from './profile';

/** Public columns of the directory (emails are private — see 0002_trial.sql). */
const PROFILE_COLS = 'handle,name,city_id,initials,color,passport_no,joined,role,beat,followers,user_id,avatar_url,bio';

/** Normalize a handle to a stable key: lowercase, single leading '@'. */
export function normalizeHandle(handle: string): string {
  const clean = handle.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '');
  return clean ? '@' + clean : '';
}

type ProfileRow = {
  handle: string;
  name: string;
  city_id: string | null;
  initials: string | null;
  color: string | null;
  passport_no: number | string | null;
  joined: string | null;
  role: string | null;
  beat: string | null;
  followers: number | string | null;
  user_id: string | null;
  email?: string | null;
  avatar_url: string | null;
  bio?: string | null;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    handle: row.handle,
    cityId: row.city_id || 'cdmx',
    initials: row.initials || 'NM',
    color: row.color || 'var(--sun-400)',
    passportNo: Number(row.passport_no) || 1000,
    joined: row.joined || '',
    role: (row.role as Role) || 'nomad',
    ...(row.beat ? { beat: row.beat } : {}),
    ...(row.followers != null ? { followers: Number(row.followers) } : {}),
    ...(row.user_id ? { userId: row.user_id } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
    ...(row.bio ? { bio: row.bio } : {}),
  };
}

function profileToRow(p: Profile): ProfileRow {
  return {
    handle: normalizeHandle(p.handle),
    name: p.name,
    city_id: p.cityId,
    initials: p.initials,
    color: p.color,
    passport_no: p.passportNo,
    joined: p.joined,
    role: p.role,
    beat: p.beat ?? null,
    followers: p.followers ?? null,
    user_id: p.userId ?? null,
    email: p.email ?? null,
    avatar_url: p.avatarUrl ?? null,
    bio: p.bio ?? null,
  };
}

/**
 * Is this handle free to claim? Returns true when available (or when the
 * backend is unconfigured/unreachable — the pilot never blocks account
 * creation on the network).
 */
export async function handleAvailable(handle: string): Promise<boolean> {
  const key = normalizeHandle(handle);
  if (!key || !sharedEnabled()) return true;
  try {
    const url = `${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(key)}&select=handle,user_id`;
    const res = await fetch(url, { headers: await readHeaders() });
    if (!res.ok) return true;
    const rows = (await res.json()) as ProfileRow[];
    // Free, or already ours.
    return !Array.isArray(rows) || rows.length === 0 || (!!rows[0].user_id && rows[0].user_id === currentSession()?.user.id);
  } catch {
    return true;
  }
}

/**
 * Register (or update) this person's row in the central directory, under their
 * signed-in user. Upserts on handle, so re-saving refreshes the row instead of
 * duplicating it. Best-effort — without a signed-in user (backend off, offline,
 * or accounts not open yet) the passport keeps working on the device.
 */
export async function registerProfile(p: Profile): Promise<boolean> {
  if (!sharedEnabled() || !normalizeHandle(p.handle)) return false;
  const uid = currentSession()?.user.id;
  const h = await authHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' });
  if (!uid || !h) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=handle`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ ...profileToRow({ ...p, userId: uid }), updated_at: new Date().toISOString() }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Look up an account by handle to connect it on this device. Returns the stored
 * profile, or null when not found / unconfigured.
 */
export async function fetchProfileByHandle(handle: string): Promise<Profile | null> {
  const key = normalizeHandle(handle);
  if (!key || !sharedEnabled()) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(key)}&select=${PROFILE_COLS}&limit=1`;
    const res = await fetch(url, { headers: await readHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json()) as ProfileRow[];
    return Array.isArray(rows) && rows.length ? rowToProfile(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in person's own passport, wherever they made it: by their user,
 * or (first Google sign-in) a pilot passport registered with that email.
 */
export async function fetchMyProfile(): Promise<Profile | null> {
  if (!sharedEnabled()) return null;
  const h = await authHeaders();
  if (!h) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_profile`, { method: 'POST', headers: h, body: '{}' });
    if (!res.ok) return null;
    const rows = (await res.json()) as ProfileRow[];
    return Array.isArray(rows) && rows.length ? rowToProfile(rows[0]) : null;
  } catch {
    return null;
  }
}

/** Who owns a handle (null when it's free, legacy, or unknown). */
export async function ownerOfHandle(handle: string): Promise<string | null> {
  const key = normalizeHandle(handle);
  if (!key || !sharedEnabled()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(key)}&select=user_id&limit=1`, { headers: await readHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id: string | null }[];
    return rows?.[0]?.user_id || null;
  } catch {
    return null;
  }
}

/** A first-guess handle from a Google email/name, e.g. "june.ozawa@gmail" → "@juneozawa". */
export function handleFromEmail(email: string, name?: string): string {
  const base = (email.split('@')[0] || name || 'nomad').toLowerCase().replace(/[^a-z0-9]/g, '');
  return '@' + (base.slice(0, 16) || 'nomad');
}

/**
 * Turn a desired handle into one that's actually free, appending a number if
 * taken. Falls back to the base handle if the directory can't be reached.
 */
export async function uniqueHandle(desired: string): Promise<string> {
  const base = normalizeHandle(desired) || '@nomad';
  if (await handleAvailable(base)) return base;
  for (let n = 2; n <= 9; n++) {
    const candidate = `${base}${n}`;
    if (await handleAvailable(candidate)) return candidate;
  }
  // Last resort: suffix with a short random tag.
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}
