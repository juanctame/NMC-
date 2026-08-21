/**
 * The "ideal for you" recommender. Ranks candidate places (the live Google
 * venues) for a specific foodie by blending real quality with personal taste:
 *
 *   ideal = quality (Bayesian-smoothed Google rating)
 *         × taste fit (their palate + chosen tastes)
 *         + small nudges for corroboration, open-now, and novelty.
 *
 * Bayesian smoothing means a 5.0 with 3 reviews never outranks a 4.6 with 4,000
 * — so the top picks are genuinely good places that also match the person. Each
 * result carries short, localizable reason tags for the UI to explain the pick.
 */
import type { Place } from '../store/data';
import { cuisineAxis, type Palate } from './palate';

const PRIOR_MEAN = 4.2; // global mean rating
const PRIOR_WEIGHT = 60; // reviews-equivalent prior strength

/** Bayesian-smoothed quality on Google's 0–5 scale. */
export function bayesianQuality(rating?: number, reviews?: number): number {
  const R = typeof rating === 'number' ? rating : PRIOR_MEAN;
  const n = typeof reviews === 'number' && reviews > 0 ? reviews : 0;
  return (R * n + PRIOR_MEAN * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
}

/** How well a place fits the user's palate + stated tastes (0..1). */
export function tasteFit(place: Place, palate: Palate | null, tastes: string[]): number {
  let fit = 0.5;
  if (palate) {
    const axis = cuisineAxis(place.cuisine);
    const a = palate.axes.find((x) => x.key === axis);
    if (a) fit = a.value; // 0.12..1
  }
  const cl = (place.cuisine || '').toLowerCase();
  if (tastes.some((tn) => tn.toLowerCase() === cl)) fit = Math.min(1, fit + 0.25);
  return fit;
}

export type ReasonTag = { key: string; arg?: string };
export type Rec = { place: Place; score: number; grade: number; reasons: ReasonTag[] };

export type RecOpts = {
  palate: Palate | null;
  tastes: string[];
  beenIds: Set<string>; // places already in the user's log — skip
  wantIds?: Set<string>; // want-to-try — a novelty nudge
};

function reasonsFor(p: Place, q: number, fit: number, open: boolean): ReasonTag[] {
  const out: ReasonTag[] = [];
  // Only name a real cuisine (skip the generic "Restaurant" fallback).
  if (fit >= 0.7 && p.cuisine && p.cuisine !== 'Restaurant') out.push({ key: 'rec.taste', arg: p.cuisine });
  if (q >= 4.6 && (p.reviews || 0) >= 400) out.push({ key: 'rec.beloved' });
  else if (q >= 4.5 && (p.reviews || 0) < 150) out.push({ key: 'rec.gem' });
  else if (q >= 4.4) out.push({ key: 'rec.topRated' });
  if (out.length < 2 && open) out.push({ key: 'rec.open' });
  if (!out.length) out.push({ key: 'rec.solid' });
  return out.slice(0, 2);
}

export function recommend(places: Place[], opts: RecOpts): Rec[] {
  const recs: Rec[] = [];
  for (const p of places) {
    if (opts.beenIds.has(p.id)) continue;
    const q = bayesianQuality(p.rating, p.reviews); // 0..5
    const qn = Math.max(0, Math.min(1, (q - 3.4) / 1.6)); // ~3.4..5 → 0..1
    const fit = tasteFit(p, opts.palate, opts.tastes);
    const open = /open/i.test(p.openInfo || '');
    const corroboration = Math.min(1, Math.log10((p.reviews || 0) + 1) / 3.5); // ~3000 reviews → ~1
    const novelty = opts.wantIds?.has(p.id) ? 1 : 0.6;
    const raw = 0.42 * qn + 0.38 * fit + 0.08 * corroboration + 0.06 * (open ? 1 : 0) + 0.06 * novelty;
    recs.push({
      place: p,
      score: Math.round(100 * raw),
      grade: Math.round(q * 10) / 10, // the smoothed 0–5 quality, for display
      reasons: reasonsFor(p, q, fit, open),
    });
  }
  recs.sort((a, b) => b.score - a.score);
  return recs;
}
