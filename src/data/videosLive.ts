/**
 * Live hashtag video search (native fallback). The YouTube browser key is
 * HTTP-referrer-restricted to the website, so native builds don't call it here;
 * they rely on the hashtag deep-links (Open on TikTok / Instagram / YouTube),
 * which work everywhere. A real native build would use a platform key or a
 * backend gather service and can fill this in with the same TrendingVideo shape.
 * Metro resolves videosLive.web.ts for the web export instead.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { TrendingVideo } from './videos';

export function youtubeEnabled(): boolean {
  return false;
}

export async function searchPlaceVideos(_place: Place, _city?: City): Promise<TrendingVideo[]> {
  return [];
}
