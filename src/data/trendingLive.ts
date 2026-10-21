/**
 * "Trending now" (native) — ranked from the CI-collected creator clips only (no
 * live search on native; see videosLive.ts). Same BuzzResult shape as the web
 * build, whose trendingLive.web.ts adds a small live top-up.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { BuzzResult } from './trending';
import { collectedTrending } from './clips';

export function trendingEnabled(): boolean {
  return true;
}

export async function computeMonthlyTrending(places: Place[], _city?: City): Promise<BuzzResult[]> {
  return collectedTrending(places);
}
