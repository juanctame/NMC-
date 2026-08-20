/**
 * Monthly-trending algorithm (web) — "the most mentioned restaurants on social
 * this month". For a capped set of candidate places it asks the YouTube Data
 * API for videos published in the last 30 days, scores each place by a buzz
 * metric (recent mentions weighted by view count and recency), and pairs it
 * with a hero clip from the most-viewed creator — linked to an in-app tastemaker
 * where we can match one.
 *
 * YouTube is the one social platform whose search + embed work from a browser
 * with just an API key, so it's the live signal here; TikTok/Instagram mention
 * volume needs a backend/OAuth and can extend this same BuzzResult shape later.
 *
 * Cost: one search.list (100 units) per candidate + one videos.list (1 unit)
 * batch. The store caches the result per city so this runs at most a couple of
 * times a day. Native uses trendingLive.ts (a no-op). Empty result on any
 * failure, so the Feed simply falls back to its seeded trending strip.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { TrendingVideo } from './videos';
import { hashtagOf } from './hashtags';
import { matchAppCreator, MONTH_MS, type BuzzResult, type BuzzCreator } from './trending';
import { YOUTUBE_API_KEY } from '../config';

/** How many places we're willing to spend a search on per refresh (quota). */
const MAX_PLACES = 10;
const PER_PLACE = 5;
const DAY = 24 * 60 * 60 * 1000;

export function trendingEnabled(): boolean {
  return !!YOUTUBE_API_KEY;
}

function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

type RawVid = {
  vid: string;
  placeId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumb?: string;
  views: number;
};

/** One recent-videos search for a place; snippet only (views come later). */
async function searchPlace(place: Place, city?: City, publishedAfter?: string): Promise<RawVid[]> {
  const tag = hashtagOf(place);
  const q = `#${tag} ${place.name}${city ? ' ' + city.name : ''}`;
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    order: 'viewCount',
    maxResults: String(PER_PLACE),
    q,
    key: YOUTUBE_API_KEY,
    ...(publishedAfter ? { publishedAfter } : {}),
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    return items
      .filter((it) => it?.id?.videoId)
      .map((it) => {
        const sn = it.snippet || {};
        return {
          vid: it.id.videoId as string,
          placeId: place.id,
          title: decodeEntities(sn.title || ''),
          channelTitle: sn.channelTitle || 'YouTube',
          channelId: sn.channelId || '',
          publishedAt: sn.publishedAt || '',
          thumb: sn.thumbnails?.medium?.url || sn.thumbnails?.high?.url || sn.thumbnails?.default?.url,
          views: 0,
        } as RawVid;
      });
  } catch {
    return [];
  }
}

/** Fill in view counts for a batch of video ids (one videos.list call ≤50 ids). */
async function fillViews(ids: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const params = new URLSearchParams({
    part: 'statistics',
    id: ids.slice(0, 50).join(','),
    key: YOUTUBE_API_KEY,
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
    if (!res.ok) return out;
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    for (const it of items) {
      const v = Number(it?.statistics?.viewCount);
      out[it.id] = Number.isFinite(v) ? v : 0;
    }
  } catch {
    /* leave views at 0 */
  }
  return out;
}

function heroVideo(place: Place, v: RawVid): TrendingVideo {
  return {
    id: 'yt-' + v.vid,
    placeId: place.id,
    platform: 'youtube',
    creator: v.channelTitle,
    handle: '',
    caption: v.title,
    sourceUrl: 'https://www.youtube.com/watch?v=' + v.vid,
    embedId: v.vid,
    thumb: v.thumb,
    publishedAt: v.publishedAt,
  };
}

/**
 * Rank the given candidate places by last-30-days social buzz. Returns only
 * places with at least one recent video, most-buzzy first.
 */
export async function computeMonthlyTrending(places: Place[], city?: City): Promise<BuzzResult[]> {
  if (!YOUTUBE_API_KEY || !places.length) return [];
  const candidates = places.slice(0, MAX_PLACES);
  const publishedAfter = new Date(Date.now() - MONTH_MS).toISOString();

  // 1) One recent-videos search per candidate (parallel).
  const perPlace = await Promise.all(candidates.map((p) => searchPlace(p, city, publishedAfter)));

  // 2) One batched stats call to attach view counts.
  const allIds = perPlace.flat().map((v) => v.vid);
  const views = await fillViews(Array.from(new Set(allIds)));

  const now = Date.now();
  const byId: Record<string, Place> = {};
  candidates.forEach((p) => (byId[p.id] = p));

  // 3) Score each place.
  const results: BuzzResult[] = [];
  perPlace.forEach((vids, i) => {
    const place = candidates[i];
    if (!vids.length) return;
    let buzz = 0;
    let totalViews = 0;
    let hero: RawVid | null = null;
    for (const v of vids) {
      v.views = views[v.vid] ?? 0;
      totalViews += v.views;
      const ageDays = v.publishedAt ? (now - Date.parse(v.publishedAt)) / DAY : 30;
      const recency = Math.exp(-Math.max(0, ageDays) / 21); // ~3-week decay
      buzz += Math.log10(v.views + 10) * (0.55 + 0.45 * recency);
      if (!hero || v.views > hero.views) hero = v;
    }
    buzz += vids.length * 0.4; // reward sheer volume of mentions
    if (!hero) return;
    const match = matchAppCreator(hero.channelTitle, hero.channelId);
    const creator: BuzzCreator = { name: hero.channelTitle, channelId: hero.channelId, handle: '' };
    results.push({
      placeId: place.id,
      name: place.name,
      buzz: Math.round(buzz * 100) / 100,
      mentions: vids.length,
      totalViews,
      video: heroVideo(place, hero),
      creator,
      ...(match ? { appCreatorId: match.id, appCreatorPlaceId: match.placeId } : {}),
    });
  });

  results.sort((a, b) => b.buzz - a.buzz);
  return results;
}
