/**
 * Social platforms a creator clip can come from. (The in-app creators are the
 * real ones connected from their clips — see critics.ts; nothing is seeded here.)
 */

export type Platform = 'tiktok' | 'instagram' | 'youtube';

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
