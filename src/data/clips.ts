/**
 * Creator clips per restaurant — YouTube videos found by each venue's hashtag,
 * filtered to third-party creators and high quality (see clipRank.ts), played
 * inside the app through YouTube's embedded player (no redirect).
 *
 * Clips come from src/data/videos.json, collected in CI by
 * scripts/collect-videos.mjs within the YouTube API's daily quota, so visitors
 * don't each spend a search. Venues not yet collected fall back to a live search
 * in the browser (videosLive.web.ts, cached per device).
 */
import manifest from './videos.json';
import type { Place } from '../store/data';
import type { Clip } from './clipRank';
import type { BuzzResult } from './trending';

type VideosManifest = {
  generatedAt: string;
  status?: string; // 'ok' | 'api-disabled' | 'quota' | 'no-key' | 'never-run'
  venues: Record<string, { searchedAt: string; clips: Clip[] }>;
};
const M = manifest as unknown as VideosManifest;

/** Collected clips for a venue (undefined = not collected yet; [] = none qualify). */
export function collectedClips(placeId: string): Clip[] | undefined {
  return M.venues?.[placeId]?.clips;
}

/** Why there may be no clips yet — surfaced in docs/diagnostics. */
export const CLIPS_STATUS = M.status || 'never-run';

const DAY = 864e5;

/**
 * "Trending now": venues ranked by recent creator buzz — each qualifying clip
 * counts by its reach (log views) and freshness (≈6-week decay), plus a little
 * for sheer volume. The hero is the venue's best clip. Venues need at least one
 * clip from the last year to trend.
 */
export function buzzFromClips(
  places: Place[],
  clipsOf: (p: Place) => Clip[] | undefined,
  now = Date.now(),
): BuzzResult[] {
  const out: BuzzResult[] = [];
  for (const p of places) {
    const clips = (clipsOf(p) || []).filter((c) => c.publishedAt && now - Date.parse(c.publishedAt) < 365 * DAY);
    if (!clips.length) continue;
    let buzz = clips.length * 0.4;
    let totalViews = 0;
    for (const c of clips) {
      const age = Math.max(0, (now - Date.parse(c.publishedAt!)) / DAY);
      buzz += Math.log10(c.views + 10) * (0.3 + 0.7 * Math.exp(-age / 45));
      totalViews += c.views;
    }
    const hero = clips.slice().sort((a, b) => b.score - a.score)[0];
    out.push({
      placeId: p.id,
      name: p.name,
      buzz: Math.round(buzz * 100) / 100,
      mentions: clips.length,
      totalViews,
      video: hero,
      creator: { name: hero.creator, channelId: '', handle: '' },
    });
  }
  return out.sort((a, b) => b.buzz - a.buzz);
}

/** Trending computed purely from the collected manifest (no network). */
export function collectedTrending(places: Place[]): BuzzResult[] {
  return buzzFromClips(places, (p) => collectedClips(p.id));
}
