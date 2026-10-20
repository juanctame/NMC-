/**
 * House critics — real people whose scores are their own (not CRTQ's simulated
 * reading of someone's content, like critics.ts). Each has a list from the app
 * they rank in (Beli for @tametitoeats), committed in src/data/critics/*.json
 * after it's imported from their own screenshots or export, and — when they
 * keep a CRTQ passport under the same handle — read live from it, so their
 * critic page always shows their current list.
 */
import type { Place } from '../store/data';
import { byId as seedById } from '../store/data';
import { CARTE_CDMX } from './carte';
import { SUPABASE_URL } from '../config';
import { cloudConfigured, readHeaders, timed } from './cloud';
import TAME from './critics/tametitoeats.json';

export type HouseEntry = { placeId?: string; name: string; score?: number; hood?: string; note?: string; list?: 'been' | 'want' };
export type HouseCritic = {
  id: string;
  name: string;
  handle: string;
  photo?: string;
  links: { platform: string; url: string }[];
  city: string;
  source: string; // where the list comes from ("Beli")
  asOf: string | null;
  list: HouseEntry[];
};

export const HOUSE_CRITICS: HouseCritic[] = [TAME as HouseCritic];
export const houseCriticById = (id?: string | null) => HOUSE_CRITICS.find((c) => c.id === id);

const guideById: Record<string, Place> = Object.fromEntries(CARTE_CDMX.map((p) => [p.id, p]));
export const placeOf = (e: HouseEntry): Place | undefined => (e.placeId ? guideById[e.placeId] || seedById[e.placeId] : undefined);

/** Their been-list, best first. */
export const beenOf = (c: HouseCritic, list = c.list) => list.filter((e) => e.list !== 'want' && e.score != null).sort((a, b) => (b.score || 0) - (a.score || 0));

/** Their score for a place (for "what critics say" on a place page). */
export function houseTakesFor(placeId: string): { critic: HouseCritic; entry: HouseEntry }[] {
  const out: { critic: HouseCritic; entry: HouseEntry }[] = [];
  for (const c of HOUSE_CRITICS) {
    const e = c.list.find((x) => x.placeId === placeId && x.score != null);
    if (e) out.push({ critic: c, entry: e });
  }
  return out;
}

/** Their current list from their CRTQ passport (same handle), when the backend has it. */
export async function fetchLiveList(c: HouseCritic): Promise<HouseEntry[] | null> {
  if (!cloudConfigured()) return null;
  try {
    const h = await readHeaders();
    const pr = await timed(`${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(c.handle)}&select=user_id&limit=1`, { headers: h });
    const uid = pr?.ok ? (await pr.json())?.[0]?.user_id : null;
    if (!uid) return null;
    const rr = await timed(`${SUPABASE_URL}/rest/v1/rankings?user_id=eq.${uid}&select=place_id,place_name,score,position&order=position.asc&limit=500`, { headers: h });
    if (!rr?.ok) return null;
    const rows = (await rr.json()) as { place_id: string; place_name: string | null; score: number | null }[];
    return rows.map((r) => ({ placeId: r.place_id, name: r.place_name || r.place_id, score: r.score != null ? Number(r.score) : undefined, list: 'been' as const }));
  } catch {
    return null;
  }
}
