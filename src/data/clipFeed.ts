/**
 * The Clips feed — a TikTok-style stream of creator clips, each pinned to the
 * restaurant it's about. Built from every clip we have: CI-collected clips per
 * venue (data/clips.ts), clips the app fetched live this session, and the
 * trending heroes. Best clips first, never the same restaurant twice in a row;
 * when opened from a restaurant, that restaurant's clips lead.
 */
import type { Place } from '../store/data';
import { byId as seedById } from '../store/data';
import { isPlayable, type TrendingVideo } from './videos';
import { collectedClips, collectedVenueIds } from './clips';

export type FeedClip = { clip: TrendingVideo & { views?: number; likes?: number; hd?: boolean; score?: number }; place: Place };

const PER_VENUE = 4;

export function buildClipFeed(places: Place[], extra: TrendingVideo[], focusPlaceId?: string | null): FeedClip[] {
  const byPlace: Record<string, Place> = {};
  places.forEach((p) => (byPlace[p.id] = p));
  // CDMX's own seed venues (e.g. Panadería Rosetta) aren't in the guide list but have clips too.
  if (places.some((p) => p.id.startsWith('cx-')))
    collectedVenueIds().forEach((id) => {
      if (!byPlace[id] && seedById[id]) places = [...places, (byPlace[id] = seedById[id])];
    });

  const seen = new Set<string>();
  const perVenue: Record<string, FeedClip[]> = {};
  const add = (c: TrendingVideo) => {
    const place = byPlace[c.placeId];
    if (!place || !isPlayable(c) || seen.has(c.id)) return;
    seen.add(c.id);
    (perVenue[place.id] = perVenue[place.id] || []).push({ clip: c, place });
  };
  places.forEach((p) => (collectedClips(p.id) || []).forEach(add));
  extra.forEach(add);

  const score = (f: FeedClip) => f.clip.score ?? Math.log10((f.clip.views || 0) + 10);
  // A focused restaurant keeps all its clips (so any one can be opened); others give their best few.
  const pools = Object.values(perVenue).map((list) => list.sort((a, b) => score(b) - score(a)).slice(0, list[0]?.place.id === focusPlaceId ? undefined : PER_VENUE));

  // Interleave: repeatedly take the best remaining clip whose venue differs from the last one.
  const out: FeedClip[] = [];
  const focus = focusPlaceId ? pools.find((l) => l[0]?.place.id === focusPlaceId) : undefined;
  if (focus) out.push(...focus.splice(0, focus.length));
  let rest = pools.flat();
  // Each pick: the best clip once a venue's earlier appearances count against it,
  // never the same venue twice in a row, and — among near-equals — a different
  // source than the last clip, so TikToks, Shorts, Dailymotion and files mix.
  const shown: Record<string, number> = {};
  const eff = (f: FeedClip) => score(f) - 0.35 * (shown[f.place.id] || 0);
  while (rest.length) {
    rest.sort((a, b) => eff(b) - eff(a));
    const last = out[out.length - 1];
    const okVenue = (f: FeedClip) => f.place.id !== last?.place.id;
    const first = rest.find(okVenue);
    const tier = first ? eff(first) - 0.5 : -Infinity;
    let i = rest.findIndex((f) => okVenue(f) && eff(f) >= tier && f.clip.platform !== last?.clip.platform);
    if (i < 0) i = rest.findIndex(okVenue);
    if (i < 0) i = 0;
    shown[rest[i].place.id] = (shown[rest[i].place.id] || 0) + 1;
    out.push(...rest.splice(i, 1));
  }
  return out;
}
