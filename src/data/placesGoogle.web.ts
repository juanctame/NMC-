/**
 * Google Places provider (web) — pulls as many real, current restaurants across
 * the selected city as Google will legitimately return, and shows each venue's
 * actual Google Maps photo.
 *
 * How it maximizes coverage: Google's Nearby Search returns at most ~60 places
 * per query (3 pages of 20) within one radius, so a single search only sees the
 * area around one point. To cover the whole city we tile it into a GRID of
 * search points and page through each, then dedupe by place_id — turning ~20
 * results into several hundred live venues spread across the city.
 *
 * Compliance note: this fetches Places data LIVE at runtime and never stores it;
 * photos are loaded from Google's own Places Photo endpoint (via photo.getUrl)
 * with attribution, never downloaded or re-hosted. That is the sanctioned way to
 * use Google Places data — the app cannot legally cache the whole city's
 * database or export/redistribute the photos.
 *
 * Requires the "Places API" (and Maps JavaScript API) enabled on the browser key
 * (see src/config.ts). Native uses placesGoogle.ts (OSM) — the Places JS library
 * is web-only.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { loadGoogleMaps } from './googleMaps';
import { PHOTO_POOL } from '../assets';
import { cuisineFromGoogleTypes } from './cuisines';

const PRICE = ['$', '$', '$$', '$$$', '$$$$']; // Google price_level 0–4

// City-tiling knobs. GRID×GRID search points spread across ~SPAN degrees, each
// covering RADIUS metres, paged MAX_PAGES deep. Higher = more of the city but
// more API calls (each point/page is one Nearby Search request). Tuned for a
// broad single-session sweep of central CDMX; dial down to spend less quota.
const GRID = 4; // 4×4 = 16 search points
const SPAN = 0.11; // ≈ 12 km across, centred on the city
const RADIUS = 2400; // metres per point (overlaps neighbours)
const MAX_PAGES = 2; // up to 40 places per point
const CONCURRENCY = 8; // points searched at once (avoids request bursts)

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A GRID×GRID lattice of lat/lon points centred on the city. */
function gridPoints(center: { lat: number; lon: number }): { lat: number; lon: number }[] {
  const pts: { lat: number; lon: number }[] = [];
  const step = SPAN / (GRID - 1);
  const start = -SPAN / 2;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      pts.push({ lat: center.lat + start + i * step, lon: center.lon + start + j * step });
    }
  }
  return pts;
}

/** One point's restaurants, paged up to MAX_PAGES. Never rejects — [] on error. */
function searchPoint(maps: any, service: any, pt: { lat: number; lon: number }): Promise<any[]> {
  return new Promise((resolve) => {
    const acc: any[] = [];
    let pages = 0;
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve(acc);
      }
    };
    const handle = (results: any[], status: any, pagination: any) => {
      if (status === maps.places.PlacesServiceStatus.OK && Array.isArray(results)) acc.push(...results);
      pages += 1;
      if (pagination && pagination.hasNextPage && pages < MAX_PAGES) {
        // The JS library needs a short delay before nextPage() is valid.
        setTimeout(() => {
          try {
            pagination.nextPage();
          } catch {
            done();
          }
        }, 2200);
      } else {
        done();
      }
    };
    try {
      service.nearbySearch(
        { location: new maps.LatLng(pt.lat, pt.lon), radius: RADIUS, type: 'restaurant' },
        handle
      );
    } catch {
      done();
    }
    // Safety timeout so one hung point can't stall the whole sweep.
    setTimeout(done, 12000);
  });
}

/** Run point searches with bounded concurrency, flattening all results. */
async function sweep(maps: any, service: any, pts: { lat: number; lon: number }[]): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < pts.length; i += CONCURRENCY) {
    const batch = pts.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((pt) => searchPoint(maps, service, pt)));
    results.forEach((r) => out.push(...r));
  }
  return out;
}

/** Strip HTML tags from a Google photo attribution string. */
function plainAttr(html?: string): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]*>/g, '').trim() || undefined;
}

export function googleSearchNearby(city: City): Promise<Place[]> {
  return loadGoogleMaps().then(async (maps) => {
    const service = new maps.places.PlacesService(document.createElement('div'));
    const raw = await sweep(maps, service, gridPoints(city.center));

    // Dedupe by place_id (grid points overlap, so venues repeat).
    const seen = new Set<string>();
    const places: Place[] = [];
    for (const r of raw) {
      if (!r?.place_id || seen.has(r.place_id)) continue;
      if (!r.geometry?.location) continue;
      if (r.business_status && r.business_status !== 'OPERATIONAL') continue;
      seen.add(r.place_id);

      const id = 'g-' + r.place_id;
      const cuisine = cuisineFromGoogleTypes(r.types);
      const hood = r.vicinity ? r.vicinity.split(',').slice(-1)[0].trim() || city.defaultHood : city.defaultHood;
      const priceLvl = typeof r.price_level === 'number' ? r.price_level : 1;
      // Real Google Maps photo, served live from Google with attribution.
      let photoUrl: string | undefined;
      let photoAttr: string | undefined;
      const ph = Array.isArray(r.photos) && r.photos.length ? r.photos[0] : null;
      if (ph && typeof ph.getUrl === 'function') {
        try {
          photoUrl = ph.getUrl({ maxWidth: 800, maxHeight: 600 });
          photoAttr = plainAttr(Array.isArray(ph.html_attributions) ? ph.html_attributions[0] : undefined);
        } catch {
          photoUrl = undefined;
        }
      }
      places.push({
        id,
        name: r.name,
        cuisine,
        hood,
        price: PRICE[priceLvl] || '$$',
        photo: PHOTO_POOL[hash(id) % PHOTO_POOL.length], // fallback if no live photo
        photoUrl,
        photoAttr,
        addr: r.vicinity || r.name,
        blurb: `${cuisine} near ${hood}. Straight from Google Maps — be the first of us to rank it.`,
        openInfo: r.opening_hours ? (r.opening_hours.open_now ? 'Open now' : 'Closed now') : '',
        lat: r.geometry.location.lat(),
        lon: r.geometry.location.lng(),
        source: 'google' as const,
        rated: false,
        rating: typeof r.rating === 'number' ? r.rating : undefined,
        reviews: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : undefined,
      });
    }

    // Trending first: weight rating by how many people rated it.
    places.sort((a, b) => (b.reviews || 0) * (b.rating || 0) - (a.reviews || 0) * (a.rating || 0));
    return places;
  });
}
