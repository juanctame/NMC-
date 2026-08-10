/**
 * Shared reviews backend (Supabase REST / PostgREST). When SUPABASE_URL +
 * SUPABASE_ANON_KEY are set, reviews written by any tester are pushed to a
 * shared table and read back by everyone — turning the per-device demo into a
 * real community. Uses plain fetch (no SDK) so it works the same on web and
 * native. When unconfigured, every function is a safe no-op and the app runs
 * exactly as before (local-only). See SHARED_DEMO.md for setup + SQL.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import type { Review } from './reviews';

export function sharedEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

type Row = {
  id: string;
  place_id: string;
  author: string;
  initials: string | null;
  color: string | null;
  score: number | string;
  text: string | null;
  dish: string | null;
  dish_photo: string | null;
  critic: boolean | null;
  created_at?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return 'recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

function rowToReview(row: Row): Review {
  return {
    id: row.id,
    placeId: row.place_id,
    authorId: 'shared',
    author: row.author,
    initials: row.initials || '·',
    color: row.color || 'var(--ink-400)',
    score: Number(row.score) || 0,
    text: row.text || '',
    date: timeAgo(row.created_at),
    baseLikes: 0,
    friend: false,
    ...(row.critic ? { critic: true } : {}),
    ...(row.dish ? { dish: row.dish, dishPhoto: row.dish_photo || undefined } : {}),
  };
}

/** All shared reviews for a place, newest first. Empty if unconfigured/offline. */
export async function fetchSharedReviews(placeId: string): Promise<Review[]> {
  if (!sharedEnabled()) return [];
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/reviews?place_id=eq.${encodeURIComponent(placeId)}` +
      `&select=*&order=created_at.desc&limit=200`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return [];
    const rows = (await res.json()) as Row[];
    return Array.isArray(rows) ? rows.map(rowToReview) : [];
  } catch {
    return [];
  }
}

/** Publish a review so other testers see it. Best-effort; failures are silent. */
export async function pushSharedReview(r: Review): Promise<void> {
  if (!sharedEnabled()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        id: r.id,
        place_id: r.placeId,
        author: r.author,
        initials: r.initials,
        color: r.color,
        score: r.score,
        text: r.text,
        dish: r.dish ?? null,
        dish_photo: r.dishPhoto ?? null,
        critic: !!r.critic,
      }),
    });
  } catch {
    // Non-fatal: the review still lives locally for this tester.
  }
}
