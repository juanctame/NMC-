/**
 * Shared places cache — client read seam.
 *
 * Instead of every browser spending Google Places quota on a full city sweep at
 * load, the app reads one central, periodically-swept index from Supabase (the
 * `public.places` table, filled by the scheduled `sweep-places` Edge Function).
 * Clients only ever READ it; the sweep is the only writer. When the cache is
 * unconfigured/empty/unreachable, the store falls back to the live client sweep,
 * so nothing breaks — this is a pure optimization seam, mirroring shared.ts.
 *
 * The table stores Google's RAW fields; we derive the app's display shape here
 * with the SAME mapping the live sweep uses (src/data/placesGoogle.web.ts), so
 * cached and live venues are indistinguishable. Photos are not re-hosted: each
 * row keeps a `photo_reference`, and we point the image at the `place-photo`
 * proxy, which resolves it to Google's live photo (keeping the server key
 * private) with attribution preserved.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import type { Place } from '../store/data';
import { cityById } from './cities';
import { cuisineFromGoogleTypes } from './cuisines';
import { PHOTO_POOL } from '../assets';

const PRICE = ['$', '$', '$$', '$$$', '$$$$']; // Google price_level 0–4
const LIMIT = 2000; // plenty for a city; the sweep dedupes before it writes

/** The shared cache is on when a Supabase project is configured (same env as reviews). */
export function cacheEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function headers(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

/**
 * Live-photo proxy URL for a Google `photo_reference`. The `place-photo` Edge
 * Function resolves the reference server-side (with the private server key) and
 * 302-redirects to Google's keyless photo URL, so this is safe as an <img> src
 * and the server key never ships to the browser.
 */
export function photoProxy(ref: string, w = 800): string {
  return `${SUPABASE_URL}/functions/v1/place-photo?ref=${encodeURIComponent(ref)}&w=${w}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type Row = {
  id: string;
  city_id: string;
  name: string;
  gtypes: string[] | null;
  price_level: number | null;
  vicinity: string | null;
  lat: number | null;
  lon: number | null;
  rating: number | null;
  reviews: number | null;
  photo_ref: string | null;
  photo_refs: string[] | null;
  photo_attr: string | null;
  open_now: boolean | null;
  updated_at: string | null;
};

export type CachedPlaces = {
  places: Place[];
  /** ISO time of the freshest row — when the sweep last refilled this city. */
  updatedAt: string | null;
};

/** Short "how fresh is the shared index" label, e.g. "just now", "3h ago". */
export function cacheAgeLabel(iso: string | null): string {
  if (!iso) return 'live';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'live';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function rowToPlace(row: Row, defaultHood: string): Place {
  const id = 'g-' + row.id;
  const cuisine = cuisineFromGoogleTypes(row.gtypes || []);
  const hood = row.vicinity ? row.vicinity.split(',').slice(-1)[0].trim() || defaultHood : defaultHood;
  const priceLvl = typeof row.price_level === 'number' ? row.price_level : 1;

  // Real Google photos, served live through the proxy (never re-hosted).
  const refs = (row.photo_refs && row.photo_refs.length ? row.photo_refs : row.photo_ref ? [row.photo_ref] : []).filter(
    Boolean
  );
  const photoUrls = refs.length ? refs.map((r) => photoProxy(r)) : undefined;

  return {
    id,
    name: row.name,
    cuisine,
    hood,
    price: PRICE[priceLvl] || '$$',
    photo: PHOTO_POOL[hash(id) % PHOTO_POOL.length], // fallback only if a venue has no photos
    photoUrl: photoUrls ? photoUrls[0] : undefined,
    photoUrls,
    photoAttr: row.photo_attr || undefined,
    addr: row.vicinity || row.name,
    blurb: `${cuisine} near ${hood}. Straight from Google Maps — be the first of us to rank it.`,
    openInfo: typeof row.open_now === 'boolean' ? (row.open_now ? 'Open now' : 'Closed now') : '',
    lat: typeof row.lat === 'number' ? row.lat : undefined,
    lon: typeof row.lon === 'number' ? row.lon : undefined,
    source: 'google' as const,
    rated: false,
    rating: typeof row.rating === 'number' ? row.rating : undefined,
    reviews: typeof row.reviews === 'number' ? row.reviews : undefined,
  };
}

/**
 * All cached venues for a city, best first, plus when the index was last swept.
 * Returns an empty list when the cache is unconfigured, empty, or unreachable —
 * the caller then does the live sweep.
 */
export async function fetchCachedPlaces(cityId: string): Promise<CachedPlaces> {
  if (!cacheEnabled()) return { places: [], updatedAt: null };
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/places?city_id=eq.${encodeURIComponent(cityId)}` +
      `&select=*&order=rating.desc.nullslast&limit=${LIMIT}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return { places: [], updatedAt: null };
    const rows = (await res.json()) as Row[];
    if (!Array.isArray(rows) || !rows.length) return { places: [], updatedAt: null };
    const defaultHood = cityById(cityId).defaultHood;
    const clean = rows.filter((r) => r && r.id && r.name);
    const places = clean.map((r) => rowToPlace(r, defaultHood));
    // Trending first: weight rating by how many people rated it (mirrors the live sweep).
    places.sort((a, b) => (b.reviews || 0) * (b.rating || 0) - (a.reviews || 0) * (a.rating || 0));
    // Freshest row = when the sweep last touched this city.
    let updatedAt: string | null = null;
    for (const r of clean) if (r.updated_at && (!updatedAt || r.updated_at > updatedAt)) updatedAt = r.updated_at;
    return { places, updatedAt };
  } catch {
    return { places: [], updatedAt: null };
  }
}
