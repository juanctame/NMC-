/**
 * Monthly-trending algorithm (native fallback). The YouTube browser key is
 * HTTP-referrer-restricted to the website, so native builds don't compute the
 * live ranking here — the Feed falls back to its seeded trending strip, and the
 * per-place hashtag deep-links still reach TikTok / Instagram / YouTube. A real
 * native build would point this at a platform key or a backend that aggregates
 * cross-platform mention volume, returning the same BuzzResult[]. Metro resolves
 * trendingLive.web.ts for the web export.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { BuzzResult } from './trending';

export function trendingEnabled(): boolean {
  return false;
}

export async function computeMonthlyTrending(_places: Place[], _city?: City): Promise<BuzzResult[]> {
  return [];
}
