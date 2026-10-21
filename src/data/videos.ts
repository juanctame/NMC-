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

/** Where a clip comes from: the social platforms' embed players, or open video files played natively. */
export type VideoSource = Platform | 'vimeo' | 'dailymotion' | 'commons' | 'archive';

export const SOURCE_LABEL: Record<VideoSource, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  commons: 'Wikimedia Commons',
  archive: 'Internet Archive',
};

export type TrendingVideo = {
  id: string;
  placeId: string;
  platform: VideoSource;
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
  /** Direct video file (Commons / Internet Archive) — played natively, as MP4 / WebM. */
  src?: string;
  mime?: string;
  /** Licence of an open file (shown with the credit). */
  license?: string;
  /** Portrait clip (shorts, TikToks, reels). */
  vertical?: boolean;
  /** 'venue' = about this place; 'dish' / 'area' = related footage, labelled as such. */
  scope?: 'venue' | 'dish' | 'area';
  relatedTo?: string;
};

/** A clip the app can play in place (an embed id or a direct file). */
export const isPlayable = (v: TrendingVideo) => !!(v.embedId || v.src);

/** Build the platform embed-player URL for in-app playback (WebView / iframe). */
export function embedUrlFor(v: TrendingVideo): string | null {
  if (v.src) return v.src; // open video file — the browser / WebView plays it natively
  if (!v.embedId) return null;
  switch (v.platform) {
    case 'youtube':
      // Privacy-enhanced embed; rel=0 keeps end-screen suggestions to the same creator.
      return `https://www.youtube-nocookie.com/embed/${v.embedId}?playsinline=1&rel=0&modestbranding=1`;
    case 'tiktok':
      return `https://www.tiktok.com/player/v1/${v.embedId}?rel=0`;
    case 'instagram':
      return `https://www.instagram.com/reel/${v.embedId}/embed/?hidecaption=1`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${v.embedId}?playsinline=1&dnt=1`;
    case 'dailymotion':
      return `https://www.dailymotion.com/embed/video/${v.embedId}?queue-enable=false&sharing-enable=false`;
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
