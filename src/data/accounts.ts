/**
 * Central user directory (Supabase REST / PostgREST). This is the "users
 * database": every username created in the app is registered here, keyed by a
 * unique handle, so accounts live centrally instead of only on one device.
 * That lets a tester reconnect their passport on another device by handle, and
 * keeps usernames from colliding across the community.
 *
 * Uses plain fetch (no SDK) so it behaves identically on web and native, and
 * degrades to safe no-ops when SUPABASE_URL / SUPABASE_ANON_KEY are unset — the
 * app then runs local-only, exactly as before. See SHARED_DEMO.md for the SQL.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { sharedEnabled } from './shared';
import type { Profile, Role } from './profile';

/** Normalize a handle to a stable key: lowercase, single leading '@'. */
export function normalizeHandle(handle: string): string {
  const clean = handle.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '');
  return clean ? '@' + clean : '';
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
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
    const url = `${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(key)}&select=handle`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return true;
    const rows = (await res.json()) as ProfileRow[];
    return !Array.isArray(rows) || rows.length === 0;
  } catch {
    return true;
  }
}

/**
 * Register (or update) a username in the central directory. Upserts on handle,
 * so re-saving the same account refreshes its row instead of duplicating it.
 * Best-effort — a failure leaves the account working locally.
 */
export async function registerProfile(p: Profile): Promise<void> {
  if (!sharedEnabled() || !normalizeHandle(p.handle)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(profileToRow(p)),
    });
  } catch {
    // Non-fatal: the account still lives on this device.
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
    const url = `${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(key)}&select=*&limit=1`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return null;
    const rows = (await res.json()) as ProfileRow[];
    return Array.isArray(rows) && rows.length ? rowToProfile(rows[0]) : null;
  } catch {
    return null;
  }
}
