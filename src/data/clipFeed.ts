/**
 * The Clips feed — a TikTok-style stream of creator clips, each pinned to the
 * restaurant it's about. Built from every clip we have: CI-collected clips per
 * venue (data/clips.ts), clips the app fetched live this session, and the
 * trending heroes. Best clips first, never the same restaurant twice in a row;
 * when opened from a restaurant, that restaurant's clips lead.
 */
import type { Place } from '../store/data';
import type { TrendingVideo } from './videos';
import { collectedClips } from './clips';

export type FeedClip = { clip: TrendingVideo & { views?: number; likes?: number; hd?: boolean; score?: number }; place: Place };

const PER_VENUE = 3;

export function buildClipFeed(places: Place[], extra: TrendingVideo[], focusPlaceId?: string | null): FeedClip[] {
  const byPlace: Record<string, Place> = {};
  places.forEach((p) => (byPlace[p.id] = p));

  const seen = new Set<string>();
  const perVenue: Record<string, FeedClip[]> = {};
  const add = (c: TrendingVideo) => {
    const place = byPlace[c.placeId];
    if (!place || !c.embedId || seen.has(c.id)) return;
    seen.add(c.id);
    (perVenue[place.id] = perVenue[place.id] || []).push({ clip: c, place });
  };
  places.forEach((p) => (collectedClips(p.id) || []).forEach(add));
  extra.forEach(add);

  const score = (f: FeedClip) => f.clip.score ?? Math.log10((f.clip.views || 0) + 10);
  const pools = Object.values(perVenue).map((list) => list.sort((a, b) => score(b) - score(a)).slice(0, PER_VENUE));

  // Interleave: repeatedly take the best remaining clip whose venue differs from the last one.
  const out: FeedClip[] = [];
  const focus = focusPlaceId ? pools.find((l) => l[0]?.place.id === focusPlaceId) : undefined;
  if (focus) out.push(...focus.splice(0, focus.length));
  let rest = pools.flat();
  while (rest.length) {
    rest.sort((a, b) => score(b) - score(a));
    const last = out[out.length - 1]?.place.id;
    const i = rest.findIndex((f) => f.place.id !== last);
    out.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}
