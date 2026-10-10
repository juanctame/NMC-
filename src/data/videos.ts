/**
 * The shape of a creator clip about a place, and its in-app embed player URL.
 *
 * Real clips come from the hashtag pipeline (clipRank.ts → clips.ts /
 * videosLive.web.ts): third-party YouTube creators only, HD, embeddable, and
 * always played inside the app through the platform's official embedded player
 * — never by redirecting out. (Platforms don't offer downloadable MP4s; their
 * embed players stream the video in place.)
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
  /** Poster thumbnail URL (set by the live hashtag search). */
  thumb?: string;
  /** ISO publish date (set by the live hashtag search) for a "3d ago" note. */
  publishedAt?: string;
};

/** Build the platform embed-player URL for in-app playback (WebView / iframe). */
export function embedUrlFor(v: TrendingVideo): string | null {
  if (!v.embedId) return null;
  switch (v.platform) {
    case 'youtube':
      // Privacy-enhanced embed; rel=0 keeps end-screen suggestions to the same creator.
      return `https://www.youtube-nocookie.com/embed/${v.embedId}?playsinline=1&rel=0&modestbranding=1`;
    case 'tiktok':
      return `https://www.tiktok.com/player/v1/${v.embedId}?rel=0`;
    case 'instagram':
      return `https://www.instagram.com/reel/${v.embedId}/embed`;
    default:
      return null;
  }
}

/** Credits shown under the in-app player (who made it, where it's from). */
export type VideoMeta = {
  title: string;
  creator: string;
  platform: string;
  views?: number;
  placeName?: string;
  hd?: boolean;
};
