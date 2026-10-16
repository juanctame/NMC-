/**
 * Monthly-trending types + creator matching (platform-agnostic).
 *
 * The "most mentioned this month" ranking scores each restaurant by how much it
 * is being talked about on social video in the last 30 days, and pairs it with
 * a real clip from a popular creator. The live computation (YouTube Data API)
 * lives in trendingLive.web.ts; this file holds the shared shape. The clip's
 * creator links to their critic profile (critics.ts) when we have one.
 */
import type { TrendingVideo } from './videos';

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
};

/** 30-day window for "last month". */
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
