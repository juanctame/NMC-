/**
 * "Trending now" (web) — CDMX venues ranked by recent creator buzz, built on the
 * same third-party, HD clip pipeline as each place's reel (data/clips.ts →
 * buzzFromClips). Uses the CI-collected clips for free; for a few top venues not
 * collected yet it runs the live search (videosLive.web.ts, cached per device).
 * The hero of each entry plays in-app.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { Clip } from './clipRank';
import type { BuzzResult } from './trending';
import { collectedClips, buzzFromClips, CLIPS_STATUS } from './clips';
import { searchPlaceVideos } from './videosLive';
import { YOUTUBE_API_KEY } from '../config';

/**
 * Live searches per refresh for uncollected venues — only while CI collection
 * isn't running yet. Once it is, trending uses collected clips only, so
 * visitors never spend the shared daily YouTube quota CI relies on.
 */
const LIVE_BUDGET = CLIPS_STATUS === 'ok' || CLIPS_STATUS === 'quota' ? 0 : 3;

export function trendingEnabled(): boolean {
  return !!YOUTUBE_API_KEY;
}

export async function computeMonthlyTrending(places: Place[], city?: City): Promise<BuzzResult[]> {
  const clips: Record<string, Clip[]> = {};
  let budget = LIVE_BUDGET;
  for (const p of places) {
    const got = collectedClips(p.id);
    if (got) clips[p.id] = got;
    else if (budget-- > 0) clips[p.id] = (await searchPlaceVideos(p, city)) as Clip[];
  }
  return buzzFromClips(places, (p) => clips[p.id]);
}
