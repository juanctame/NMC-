/**
 * Rich "before you go" details for a venue.
 *
 * On the web these are fetched live from Google Place Details (full weekly
 * hours, phone, website, Google's own editorial summary, and real Google
 * reviews) when a place is opened — never stored, shown with attribution. This
 * module also derives honest **highlights** (the draw / good to know) and a
 * **taste-fit** readout purely from real data: nothing here is fabricated.
 */
import type { Place } from '../store/data';
import type { Palate } from './palate';
import { tasteFit } from './recommend';

/** One real Google review (shown verbatim, with attribution). */
export type GReview = {
  author: string;
  authorUrl?: string;
  photo?: string;
  rating: number;
  relativeTime: string;
  text: string;
};

/** Live details for a venue; every field optional (Google may not have it). */
export type PlaceDetails = {
  phone?: string;
  website?: string;
  mapsUrl?: string;
  weekdayHours?: string[]; // ["Monday: 9:00 AM – 10:00 PM", …]
  openNow?: boolean;
  summary?: string; // Google editorial_summary.overview
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  googleReviews?: GReview[];
};

export type DetailsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * Real Google Maps photos resolved for a curated venue (by matching its
 * coordinate to its live Google twin). Shown with attribution, never stored or
 * re-hosted — so each guide restaurant gets a real picture of the place.
 */
export type LivePhoto = {
  photoUrl?: string;
  photoUrls?: string[];
  photoAttr?: string;
};

const PRICE_WORD = ['Free', 'Budget-friendly', 'Mid-range', 'Pricey', 'Splurge'];

/** Human price label, e.g. "$$$ · Pricey" when Google gives a level. */
export function priceLabel(place: Place, details?: PlaceDetails): string {
  const lvl = details?.priceLevel;
  if (typeof lvl === 'number' && PRICE_WORD[lvl]) return `${place.price} · ${PRICE_WORD[lvl]}`;
  return place.price;
}

/** Taste fit 0..1 for a place against the signed-in foodie, or null if no palate. */
export function fitFor(place: Place, palate: Palate | null, tastes: string[]): number | null {
  if (!palate) return null;
  return tasteFit(place, palate, tastes);
}

/**
 * Honest pros ("the draw") and caveats ("good to know"), derived only from real
 * signals (Google rating + volume, price, open state, taste fit, how proven the
 * place is). No invented facts — if we know little, we say so.
 */
export function drawAndKnow(
  place: Place,
  details: PlaceDetails | undefined,
  fit: number | null,
): { draws: string[]; knows: string[] } {
  const rating = place.rating ?? details?.rating;
  const reviews = place.reviews ?? details?.reviews;
  const price = place.price || '';
  const openNow = details?.openNow ?? /open/i.test(place.openInfo || '');
  const closedNow = details?.openNow === false || /closed/i.test(place.openInfo || '');
  const cuisine = place.cuisine && place.cuisine !== 'Restaurant' ? place.cuisine : '';

  const draws: string[] = [];
  const knows: string[] = [];

  // Curated acclaim (Michelin / 50 Best) — a real prestige signal for guide data.
  const awards = place.awards || '';
  if (/estrella|michelin/i.test(awards)) draws.push('Michelin-recognised');
  else if (/50 best/i.test(awards)) draws.push('On the 50 Best list');
  else if (typeof place.acclaim === 'number' && place.acclaim >= 88) draws.push("Among the city's most acclaimed");
  if (place.moment === 'Apertura 2026') draws.push('New in 2026 — ahead of the crowd');

  // Quality
  if (rating != null && reviews != null && rating >= 4.6 && reviews >= 500)
    draws.push(`Crowd favourite — ${rating.toFixed(1)}★ across ${reviews.toLocaleString()} reviews`);
  else if (rating != null && rating >= 4.5 && (reviews ?? 0) < 150)
    draws.push(`Hidden gem — ${rating.toFixed(1)}★ and still under the radar`);
  else if (rating != null && rating >= 4.3)
    draws.push(`Well-rated — ${rating.toFixed(1)}★ on Google`);

  if (reviews != null && reviews >= 2500) draws.push(`A local institution — ${reviews.toLocaleString()}+ reviews`);
  if (fit != null && fit >= 0.72 && cuisine) draws.push(`Right up your ${cuisine} alley`);
  if (price === '$') draws.push('Easy on the wallet');
  if (openNow) draws.push('Open right now');

  // Caveats (honest)
  if (reviews != null && reviews < 60) knows.push('Still proving itself — only a handful of Google reviews so far');
  if (rating == null && place.critic == null && place.acclaim == null) knows.push('No ratings yet — you could be an early voice');
  if (price === '$$$' || price === '$$$$') knows.push(`${PRICE_WORD[price.length] || 'Pricey'} — plan for a bigger bill`);
  if (closedNow) knows.push('Closed right now — check the hours before you go');
  if (rating != null && rating < 4.0) knows.push(`Mixed reviews — ${rating.toFixed(1)}★ overall`);
  if (reviews != null && reviews >= 4000) knows.push('Very popular — expect a wait at peak times');
  if (fit != null && fit < 0.4 && cuisine) knows.push('A stretch from your usual taste');

  const uniq = (a: string[]) => Array.from(new Set(a));
  const d = uniq(draws).slice(0, 4);
  const k = uniq(knows).slice(0, 3);
  if (!d.length) d.push('Fresh off the map — go in curious');
  return { draws: d, knows: k };
}
