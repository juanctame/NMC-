/**
 * Photo sync — which restaurants have you been to, from your camera roll?
 *
 * Each photo's location (EXIF GPS, read on-device) is matched to the nearest
 * place CRTQ knows — the guide, the city's discovered spots, what's nearby —
 * and the food scan (foodScan.web.ts) says whether it's a meal. A food photo
 * may sit a little further from the door (GPS indoors drifts) than a photo of
 * something else, which only counts when it's right there. Photos taken within
 * a few hours and a short walk of each other are one meal, matched by where
 * most of them were taken (so one drifted photo can't move the meal next door).
 * Meals at the same place on different days are separate visits.
 *
 *   high    a meal photographed right there, or several visits
 *   medium  a meal nearby, or (no food scan) a photo right at the door
 *   low     only non-food photos close by — suggested, not selected
 */
import type { Place } from '../store/data';

export type PhotoObs = { lat: number; lon: number; time?: number; food?: number | null; label?: string; preview: string };
export type VisitConfidence = 'high' | 'medium' | 'low';
export type Visit = {
  place: Place;
  photos: number;
  foodPhotos: number;
  visits: number;
  days: string[];
  distM: number;
  confidence: VisitConfidence;
  picked: boolean;
  preview: string;
  labels: string[];
  alts: Place[]; // other places that close, to correct a match
};

export const FOOD_MIN = 0.3;
const R_FOOD = 120;
const R_UNKNOWN = 80;
const R_OTHER = 50;
const CELL = 0.002; // ~220 m

export function metres(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLa = ((bLat - aLat) * Math.PI) / 180;
  const dLo = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const key = (la: number, lo: number) => `${Math.floor(la / CELL)}_${Math.floor(lo / CELL)}`;
const richness = (p: Place) => (p.id.startsWith('cx-') ? 3 : p.source === 'seed' || !p.source ? 2 : p.source === 'google' ? 1 : 0);

export type PlaceGrid = Map<string, Place[]>;
export function gridOf(places: Place[]): PlaceGrid {
  const g: PlaceGrid = new Map();
  const seen = new Set<string>();
  for (const p of places) {
    if (p.lat == null || p.lon == null || seen.has(p.id)) continue;
    seen.add(p.id);
    const k = key(p.lat, p.lon);
    (g.get(k) || g.set(k, []).get(k)!).push(p);
  }
  return g;
}

/** The nearest known place to a point, within `maxM` (prefers the guide's page when two are as close). */
export function nearestPlace(grid: PlaceGrid, lat: number, lon: number, maxM: number): { place: Place; d: number } | null {
  const ci = Math.floor(lat / CELL);
  const cj = Math.floor(lon / CELL);
  let best: { place: Place; d: number } | null = null;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (const p of grid.get(`${ci + i}_${cj + j}`) || []) {
        const d = metres(lat, lon, p.lat!, p.lon!);
        if (d > maxM) continue;
        // within 15 m of each other, the richer record wins
        if (!best || d < best.d - 15 || (Math.abs(d - best.d) <= 15 && richness(p) > richness(best.place))) best = { place: p, d };
      }
  return best;
}

/** Are these two points the same place? (the guide and the map both list it) */
const sameName = (a: Place, b: Place) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase();

const dayOf = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : '');

/** Places within `maxM` of a point, nearest first. */
function placesNear(grid: PlaceGrid, lat: number, lon: number, maxM: number): { place: Place; d: number }[] {
  const ci = Math.floor(lat / CELL);
  const cj = Math.floor(lon / CELL);
  const out: { place: Place; d: number }[] = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (const p of grid.get(`${ci + i}_${cj + j}`) || []) {
        const d = metres(lat, lon, p.lat!, p.lon!);
        if (d <= maxM) out.push({ place: p, d });
      }
  return out.sort((a, b) => a.d - b.d);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Photos → meals: close in time (3 h) and space (150 m). Photos without a time are their own meal. */
export function sessions(obs: PhotoObs[]): PhotoObs[][] {
  const timed = obs.filter((o) => o.time).sort((a, b) => a.time! - b.time!);
  const out: PhotoObs[][] = [];
  for (const o of timed) {
    const cur = out[out.length - 1];
    if (cur && cur[0].time && o.time! - cur[cur.length - 1].time! <= 3 * 3600e3 && metres(cur[0].lat, cur[0].lon, o.lat, o.lon) <= 150) cur.push(o);
    else out.push([o]);
  }
  obs.filter((o) => !o.time).forEach((o) => out.push([o]));
  return out;
}

/** Photos → the places you've been, with visits and confidence (pure; unit-tested). */
export function findVisits(obs: PhotoObs[], places: Place[] | PlaceGrid, opts: { foodScanned?: boolean } = {}): Visit[] {
  const grid = places instanceof Map ? places : gridOf(places);
  const isFood = (o: PhotoObs) => o.food != null && o.food >= FOOD_MIN;
  const byPlace = new Map<string, { place: Place; ph: PhotoObs[]; d: number; alts: Map<string, Place> }>();
  const assign = (place: Place, ph: PhotoObs[], d: number, alts: Place[]) => {
    // fold a guide/map twin into the record already collecting photos
    const twin = [...byPlace.values()].find((v) => v.place.id !== place.id && sameName(v.place, place) && v.place.lat != null && metres(v.place.lat, v.place.lon!, place.lat!, place.lon!) < 120);
    const id = twin ? twin.place.id : place.id;
    const cur = byPlace.get(id) || { place: twin ? twin.place : place, ph: [], d: Infinity, alts: new Map<string, Place>() };
    cur.ph.push(...ph);
    cur.d = Math.min(cur.d, d);
    alts.filter((a) => a.id !== cur.place.id && !sameName(a, cur.place)).forEach((a) => cur.alts.set(a.id, a));
    byPlace.set(id, cur);
  };
  for (const meal of sessions(obs)) {
    const food = meal.some(isFood);
    const unknown = meal.every((o) => o.food == null);
    const r = food ? R_FOOD : unknown ? R_UNKNOWN : R_OTHER;
    const lat = median(meal.map((o) => o.lat));
    const lon = median(meal.map((o) => o.lon));
    const near = placesNear(grid, lat, lon, r);
    if (near.length) {
      // within 15 m of each other, the richer record wins
      const best = near.reduce((b, x) => (x.d < b.d - 15 || (Math.abs(x.d - b.d) <= 15 && richness(x.place) > richness(b.place)) ? x : b));
      assign(best.place, meal, best.d, near.filter((x) => x !== best).slice(0, 3).map((x) => x.place));
      continue;
    }
    // the meal's middle is nowhere known: try its photos one by one
    for (const o of meal) {
      const rr = isFood(o) ? R_FOOD : o.food == null ? R_UNKNOWN : R_OTHER;
      const hit = nearestPlace(grid, o.lat, o.lon, rr);
      if (hit) assign(hit.place, [o], hit.d, placesNear(grid, o.lat, o.lon, rr).filter((x) => x.place.id !== hit.place.id).slice(0, 3).map((x) => x.place));
    }
  }
  const out: Visit[] = [];
  for (const { place, ph, d, alts } of byPlace.values()) {
    const food = ph.filter(isFood);
    const days = [...new Set(ph.map((o) => dayOf(o.time)).filter(Boolean))].sort();
    const visits = Math.max(1, days.length);
    const foodClose = food.some((o) => metres(o.lat, o.lon, place.lat!, place.lon!) <= 60);
    let confidence: VisitConfidence;
    if (foodClose || (visits >= 2 && (food.length > 0 || d <= 40))) confidence = 'high';
    else if (food.length > 0 || (!opts.foodScanned && d <= R_OTHER)) confidence = 'medium';
    else confidence = 'low';
    const labels = [...new Set(food.map((o) => o.label).filter((x): x is string => !!x))].slice(0, 3);
    out.push({
      place,
      photos: ph.length,
      foodPhotos: food.length,
      visits,
      days,
      distM: Math.round(d),
      confidence,
      picked: confidence !== 'low',
      preview: ([...food].sort((a, b) => (b.food || 0) - (a.food || 0))[0] || ph[0]).preview,
      labels,
      alts: [...alts.values()].slice(0, 3),
    });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.confidence] - rank[b.confidence] || b.visits - a.visits || b.foodPhotos - a.foodPhotos || a.distM - b.distM);
}
