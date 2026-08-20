/**
 * Palate engine — turns a foodie's own activity into a unique taste identity.
 * From the places they've ranked (cuisine + price), the tastes they picked, and
 * the dishes they've named, it derives: a six-axis palate shape (for the radar),
 * a taste archetype (a title + one-liner), a "flavor DNA" of their top cuisines,
 * and their go-to dishes. Everything is data-driven, so no two profiles match.
 *
 * Labels/archetype copy are resolved in the UI via i18n by the ids returned
 * here; this module is pure and language-agnostic.
 */
import type { Place } from '../store/data';
import type { Review } from './reviews';
import { C } from '../theme/tokens';

/** The six palate axes, in fixed radar order (labels resolved in the UI). */
export const PALATE_AXES = ['calle', 'mantel', 'mar', 'dulce', 'fuego', 'mundo'] as const;
export type AxisKey = (typeof PALATE_AXES)[number];

export type PalateAxis = { key: AxisKey; value: number }; // value 0..1
export type Palate = {
  archId: string;
  axes: PalateAxis[];
  topCuisines: { name: string; count: number; pct: number; color: string }[];
  goToDishes: string[];
  sampleSize: number;
  distinct: number;
  avg: number;
};

/** Which palate axis a cuisine belongs to. */
export function cuisineAxis(cuisine: string): AxisKey {
  const c = (cuisine || '').toLowerCase();
  if (/seafood|marisc|sushi|fish|oyster/.test(c)) return 'mar';
  if (/baker|pan|dessert|postre|café|cafe|coffee|pastr|ice cream|helader/.test(c)) return 'dulce';
  if (/fine dining|contempor|tasting|haute|gastronom/.test(c)) return 'mantel';
  if (/street|antojito|taquer|banqueta|market|mercado|food stall/.test(c)) return 'calle';
  if (/mexican|bar|cantina|bbq|grill|barbe|steak|asad|parrilla|smoke/.test(c)) return 'fuego';
  return 'mundo';
}

/** Stable on-brand color for a cuisine (for the flavor-DNA strip). */
const PALETTE = [
  C.sun400,
  C.ink400,
  C.stampGreen,
  C.stampBlue,
  C.stampPink,
  C.sun600,
  C.ink300,
  C.ink600,
  C.sun500,
];
export function cuisineColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 31) + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computePalate(ranked: Place[], tastes: string[] = [], reviews: Review[] = []): Palate {
  const raw: Record<AxisKey, number> = { calle: 0, mantel: 0, mar: 0, dulce: 0, fuego: 0, mundo: 0 };
  const cuisineCount: Record<string, number> = {};
  const scores: number[] = [];

  ranked.forEach((p) => {
    raw[cuisineAxis(p.cuisine)] += 1;
    if (p.price === '$') raw.calle += 0.5;
    else if (p.price === '$$$' || p.price === '$$$$') raw.mantel += 0.5;
    cuisineCount[p.cuisine] = (cuisineCount[p.cuisine] || 0) + 1;
    if (typeof p.score === 'number') scores.push(p.score);
  });
  tastes.forEach((tn) => (raw[cuisineAxis(tn)] += 0.7));

  const distinct = Object.keys(cuisineCount).length;
  raw.mundo += distinct * 0.5; // variety feeds the "world" axis

  // Normalize each axis to 0..1 relative to the strongest, so the shape fills.
  const max = Math.max(...PALATE_AXES.map((k) => raw[k]), 0.001);
  const axes: PalateAxis[] = PALATE_AXES.map((k) => ({ key: k, value: clamp(0.12 + 0.88 * (raw[k] / max), 0.12, 1) }));

  // Archetype: the strongest axis, unless the profile is flat / very varied.
  const total = PALATE_AXES.reduce((s, k) => s + raw[k], 0) || 1;
  let topKey: AxisKey = 'mundo';
  let topVal = -1;
  PALATE_AXES.forEach((k) => {
    if (raw[k] > topVal) {
      topVal = raw[k];
      topKey = k;
    }
  });
  const dominance = topVal / total;
  let archId: string;
  if (ranked.length === 0) archId = 'nuevo';
  else if (distinct >= 6 && dominance < 0.34) archId = 'trotamundos';
  else if (dominance < 0.26) archId = 'todoterreno';
  else archId = ARCH_FOR_AXIS[topKey];

  const topCuisines = Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, pct: count / (ranked.length || 1), color: cuisineColor(name) }));

  // Go-to dishes: most-named dishes across this member's reviews.
  const dishCount: Record<string, number> = {};
  const dishLabel: Record<string, string> = {};
  reviews.forEach((r) => {
    if (r.dish && r.dish.trim()) {
      const key = r.dish.trim().toLowerCase();
      dishCount[key] = (dishCount[key] || 0) + 1;
      if (!dishLabel[key]) dishLabel[key] = r.dish.trim();
    }
  });
  const goToDishes = Object.entries(dishCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => dishLabel[k]);

  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return { archId, axes, topCuisines, goToDishes, sampleSize: ranked.length, distinct, avg };
}

const ARCH_FOR_AXIS: Record<AxisKey, string> = {
  calle: 'banqueta',
  mantel: 'mantel',
  mar: 'mar',
  dulce: 'dulce',
  fuego: 'fuego',
  mundo: 'trotamundos',
};

/** Archetype ids (copy resolved via i18n: arch.<id>.t / arch.<id>.b). */
export const ARCHETYPES = ['banqueta', 'mantel', 'mar', 'dulce', 'fuego', 'trotamundos', 'todoterreno', 'nuevo'] as const;
