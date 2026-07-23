/**
 * Video "gather" seam — the same swappable-provider pattern as places. The app
 * asks a provider for trending clips near a city and doesn't care about the
 * source. Seeded (curated) today.
 *
 * A real gather pipeline is a backend service that polls the platform APIs
 * (YouTube Data API, TikTok Display API, Instagram Graph/oEmbed) for short-form
 * posts tagged to a venue, normalizes them to TrendingVideo[] (filling
 * `embedId` so the reel can play them in-app), caches, and respects each
 * platform's ToS + rate limits. Keys live server-side, never in the app.
 */
import { TRENDING_VIDEOS, type TrendingVideo } from './videos';
import type { City } from './cities';

export type VideoSource = 'seed' | 'youtube' | 'tiktok' | 'instagram';
export const VIDEO_SOURCE: VideoSource = 'seed';

/** Wire a backend proxy URL (recommended) or a key to enable a live provider. */
export const VIDEO_GATHER_ENDPOINT = '';

export type VideoProvider = {
  id: string;
  label: string;
  trendingNear: (city: City) => Promise<TrendingVideo[]>;
};

const seedProvider: VideoProvider = {
  id: 'seed',
  label: 'Curated',
  trendingNear: async () => TRENDING_VIDEOS,
};

const youtubeProvider: VideoProvider = {
  id: 'youtube',
  label: 'YouTube Shorts',
  trendingNear: async (_city) => {
    // GET {VIDEO_GATHER_ENDPOINT}/youtube?q=<city>+food&type=video&videoDuration=short
    // → items.map(i => ({ platform:'youtube', embedId:i.id.videoId, creator:i.snippet.channelTitle, ... }))
    throw new Error('YouTube gather not configured — set VIDEO_GATHER_ENDPOINT (backend proxy)');
  },
};

const tiktokProvider: VideoProvider = {
  id: 'tiktok',
  label: 'TikTok',
  trendingNear: async (_city) => {
    throw new Error('TikTok gather needs the Display API + a backend proxy');
  },
};

const instagramProvider: VideoProvider = {
  id: 'instagram',
  label: 'Instagram',
  trendingNear: async (_city) => {
    throw new Error('Instagram gather needs the Graph API + a backend proxy');
  },
};

export function getVideoProvider(): VideoProvider {
  switch (VIDEO_SOURCE) {
    case 'youtube':
      return VIDEO_GATHER_ENDPOINT ? youtubeProvider : seedProvider;
    case 'tiktok':
      return VIDEO_GATHER_ENDPOINT ? tiktokProvider : seedProvider;
    case 'instagram':
      return VIDEO_GATHER_ENDPOINT ? instagramProvider : seedProvider;
    default:
      return seedProvider;
  }
}
