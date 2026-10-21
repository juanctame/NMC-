/**
 * Creator clips for a place (native). Serves the CI-collected clips
 * (data/clips.ts) — the YouTube browser key is referrer-restricted to the
 * website, so native builds don't search live. Clips play in-app via the
 * YouTube embed (WebView). Metro resolves videosLive.web.ts for the web export.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { TrendingVideo } from './videos';
import { collectedClips } from './clips';

export function youtubeEnabled(): boolean {
  return false;
}

export async function searchPlaceVideos(place: Place, _city?: City): Promise<TrendingVideo[]> {
  return collectedClips(place.id) || [];
}
