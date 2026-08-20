/**
 * Monthly-trending types + creator matching (platform-agnostic).
 *
 * The "most mentioned this month" ranking scores each restaurant by how much it
 * is being talked about on social video in the last 30 days, and pairs it with
 * a real clip from a popular creator. The live computation (YouTube Data API)
 * lives in trendingLive.web.ts; this file holds the shared shape plus the logic
 * that ties a video's creator back to a tastemaker we already feature in-app.
 */
import type { TrendingVideo } from './videos';
import { CREATOR_REVIEWS } from './creators';

export type BuzzCreator = {
  name: string;
  channelId?: string;
  handle?: string;
  subscribers?: number;
};

export type BuzzResult = {
  placeId: string;
  name: string;
  /** Composite buzz score (recent mentions weighted by views + recency). */
  buzz: number;
  /** How many recent (last-30d) videos matched this place. */
  mentions: number;
  /** Sum of views across those videos. */
  totalViews: number;
  /** The hero clip: the most-viewed recent video, embeddable in-app. */
  video: TrendingVideo;
  /** Who made the hero clip. */
  creator: BuzzCreator;
  /** If the creator is one of our in-app tastemakers, their id + featured place. */
  appCreatorId?: string;
  appCreatorPlaceId?: string;
};

/** 30-day window for "last month". */
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Optional exact map from a YouTube channelId to an in-app creator id. Fill this
 * in once you know a tastemaker's channel (the surest link); until then we fall
 * back to fuzzy name/handle matching below.
 */
export const CREATOR_YT_CHANNELS: Record<string, string> = {
  // 'UCxxxxxxxx': 'cr-1',
};

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Try to link a video's creator to an in-app tastemaker. Exact channel map
 * first, then a conservative name/handle match (the creator's handle or full
 * name appears in the channel title, or vice-versa). Returns the creator's id
 * and their featured place, or null.
 */
export function matchAppCreator(
  channelTitle: string,
  channelId?: string
): { id: string; placeId: string } | null {
  if (channelId && CREATOR_YT_CHANNELS[channelId]) {
    const cr = CREATOR_REVIEWS.find((c) => c.id === CREATOR_YT_CHANNELS[channelId]);
    if (cr) return { id: cr.id, placeId: cr.placeId };
  }
  const ch = norm(channelTitle);
  if (!ch) return null;
  for (const cr of CREATOR_REVIEWS) {
    const handle = norm(cr.handle);
    const name = norm(cr.creator);
    if (handle && (ch.includes(handle) || handle.includes(ch))) return { id: cr.id, placeId: cr.placeId };
    if (name && name.length >= 6 && (ch.includes(name) || name.includes(ch))) return { id: cr.id, placeId: cr.placeId };
  }
  return null;
}
