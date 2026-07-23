import { C } from '../theme/tokens';

export type Band = { bg: string; fg: string };

/**
 * The single, consistent 0–10 band used for EVERY score in the app — the user's
 * rank-engine scores, Critics, People, friends, creators, reviews. Bands match
 * the Beli rank buckets: Loved 8–10, Fine 6–7.9, Not it <6.
 */
export function scoreStyle(s: number): Band {
  if (s >= 8) return { bg: C.stampGreen, fg: C.greenFg };
  if (s >= 6) return { bg: C.sun400, fg: C.inkDeep };
  return { bg: C.stampPink, fg: C.pinkFg };
}

/** The verdict word for a 0–10 score, aligned to the rank buckets. */
export function verdictOf(s: number): string {
  if (s >= 8) return 'Loved';
  if (s >= 6) return 'Fine';
  return 'Not it';
}

export function fmt(s: number): string {
  return (Math.round(s * 10) / 10).toFixed(1);
}

export function metaOf(p: { cuisine: string; hood: string; price: string }): string {
  return `${p.cuisine} · ${p.hood} · ${p.price}`;
}
