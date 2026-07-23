/**
 * Trending short-form videos, gathered from external platforms (TikTok /
 * Instagram / YouTube Shorts) and featured in the "Trending now" corner. Each
 * entry links a real post (platform + sourceUrl), its creator, and the place
 * it's about (for the poster image + scores).
 *
 * Seeded here for the pilot. A real "gather" pipeline plugs in at this shape:
 * a backend/service polls the platform APIs (TikTok Display API, Instagram
 * Graph/oEmbed, YouTube Data API) for posts tagged to a venue and normalizes
 * them into TrendingVideo[]. In-app playback then uses each platform's embed
 * player (WebView / iframe); until then we deep-link to the post.
 */
import type { Platform } from './creators';

export type TrendingVideo = {
  id: string;
  placeId: string;
  platform: Platform;
  creator: string;
  handle: string;
  caption: string;
  sourceUrl: string;
  /** Platform video/reel/short id — enables in-app embedded playback. A real
   *  gather pipeline supplies this; without it the reel deep-links out. */
  embedId?: string;
};

/** Build the platform embed-player URL for in-app playback (WebView / iframe). */
export function embedUrlFor(v: TrendingVideo): string | null {
  if (!v.embedId) return null;
  switch (v.platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${v.embedId}?playsinline=1&rel=0&modestbranding=1`;
    case 'tiktok':
      return `https://www.tiktok.com/embed/v2/${v.embedId}`;
    case 'instagram':
      return `https://www.instagram.com/reel/${v.embedId}/embed`;
    default:
      return null;
  }
}

export const TRENDING_VIDEOS: TrendingVideo[] = [
  { id: 'tv-1', placeId: 'orinoco', platform: 'tiktok', creator: 'Ana Sol', handle: '@anasolcomes', caption: 'POV: the 2am chicharrón crunch you needed to hear 🌮🔊', sourceUrl: 'https://www.tiktok.com/@anasolcomes' },
  { id: 'tv-2', placeId: 'vilsito', platform: 'tiktok', creator: 'Marco Tostado', handle: '@tacotour', caption: 'Ranking every taco at El Vilsito so you don’t have to (I did anyway)', sourceUrl: 'https://www.tiktok.com/@tacotour' },
  { id: 'tv-3', placeId: 'turix', platform: 'instagram', creator: 'Cochinita Club', handle: '@cochinitaclub', caption: 'Cochinita pib before the pib runs out. Reel it in. 🔥', sourceUrl: 'https://www.instagram.com/reel/' },
  { id: 'tv-4', placeId: 'contramar', platform: 'instagram', creator: 'Paola Ruiz', handle: '@laantojada', caption: 'The tuna tostada that broke my comment section', sourceUrl: 'https://www.instagram.com/laantojada' },
  { id: 'tv-5', placeId: 'rosetta', platform: 'youtube', creator: 'Yuki Tanaka', handle: '@tokyobites', caption: 'CDMX pan dulce tour — Shorts ep. 04 🥐', sourceUrl: 'https://www.youtube.com/@tokyobites/shorts' },
];
