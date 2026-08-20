/**
 * Live hashtag video search (web). Given a place, queries the YouTube Data API
 * v3 for real, current, embeddable clips tagged to it — using the restaurant's
 * hashtag plus its name and city for relevance — and normalizes them to the
 * app's TrendingVideo shape (with the videoId as `embedId`, so they play inside
 * the app). Native uses videosLive.ts (a no-op; the hashtag deep-links still
 * work there). Safe no-op + empty result whenever the key/API is unavailable or
 * the network is blocked, so the app never breaks on it.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { TrendingVideo } from './videos';
import { hashtagOf } from './hashtags';
import { YOUTUBE_API_KEY } from '../config';

export function youtubeEnabled(): boolean {
  return !!YOUTUBE_API_KEY;
}

/** Decode the handful of HTML entities YouTube returns in titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Real videos for a place, most-relevant first. `videoEmbeddable=true` keeps
 * only clips that play in the in-app player. Empty on any failure.
 */
export async function searchPlaceVideos(place: Place, city?: City): Promise<TrendingVideo[]> {
  if (!YOUTUBE_API_KEY) return [];
  const tag = hashtagOf(place);
  const q = `#${tag} ${place.name}${city ? ' ' + city.name : ''}`;
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    maxResults: '12',
    order: 'relevance',
    q,
    key: YOUTUBE_API_KEY,
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    return items
      .filter((it) => it?.id?.videoId)
      .map((it) => {
        const vid: string = it.id.videoId;
        const sn = it.snippet || {};
        const thumb = sn.thumbnails?.medium?.url || sn.thumbnails?.high?.url || sn.thumbnails?.default?.url;
        return {
          id: 'yt-' + vid,
          placeId: place.id,
          platform: 'youtube' as const,
          creator: sn.channelTitle || 'YouTube',
          handle: '',
          caption: decodeEntities(sn.title || ''),
          sourceUrl: 'https://www.youtube.com/watch?v=' + vid,
          embedId: vid,
          thumb,
          publishedAt: sn.publishedAt,
        } as TrendingVideo;
      });
  } catch {
    return [];
  }
}
