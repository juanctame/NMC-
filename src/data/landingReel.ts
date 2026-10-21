/**
 * The landing reel — HD clips (≥720p renditions of ≥720p originals) that loop
 * behind the sign-in screen, collected in CI by scripts/collect-landing-reel.mjs
 * from the platform's own restaurant-page clips first, then Commons footage of
 * Mexico City food. Every clip carries its credit.
 */
import manifest from './landingReel.json';

export type ReelSource = { src: string; type: string; height: number };
export type ReelClip = {
  id: string;
  title: string;
  creator: string;
  license: string;
  page: string;
  poster: string | null;
  sources: ReelSource[];
  durationSec: number | null;
  start?: number;
  placeId: string | null;
};

export const REEL: ReelClip[] = ((manifest as { clips?: ReelClip[] }).clips || []).filter((c) => c.sources?.some((s) => s.height >= 720));

/** Seconds each clip shows before the next fades in. */
export const REEL_SEGMENT_S = 7;

/** Sources best-first for a screen: 1080p for big / dense screens, else 720p first. */
export function sourcesFor(c: ReelClip, screenPx: number): ReelSource[] {
  const want = screenPx >= 1600 ? 1080 : 720;
  return [...c.sources].sort((a, b) => Math.abs(a.height - want) - Math.abs(b.height - want) || (a.type === 'video/mp4' ? -1 : 1));
}
