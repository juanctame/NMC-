import { C } from '../theme/tokens';

export type Band = { bg: string; fg: string };
export type Seal = Band & { seal: string };

/** Score roundel bands for the 0–10 ranking engine. */
export function scoreStyle(s: number): Band {
  if (s >= 8) return { bg: C.stampGreen, fg: C.greenFg };
  if (s >= 6) return { bg: C.sun400, fg: C.inkDeep };
  return { bg: C.stampPink, fg: C.pinkFg };
}

/** Rotten-Tomatoes seal bands for Critics % / People %. */
export function pctStyle(v: number): Seal {
  if (v >= 85) return { bg: C.stampGreen, fg: C.greenFg, seal: 'Certified' };
  if (v >= 70) return { bg: C.sun400, fg: C.inkDeep, seal: 'Fresh' };
  return { bg: C.stampPink, fg: C.pinkFg, seal: 'Mixed' };
}

export function fmt(s: number): string {
  return (Math.round(s * 10) / 10).toFixed(1);
}

export function metaOf(p: { cuisine: string; hood: string; price: string }): string {
  return `${p.cuisine} · ${p.hood} · ${p.price}`;
}
