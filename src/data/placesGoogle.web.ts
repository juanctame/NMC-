/**
 * Google Places provider (web) — pulls as many real, current restaurants across
 * the selected city as Google will legitimately return, streams them in as it
 * goes, and shows each venue's actual Google Maps photos.
 *
 * How it maximizes coverage: Google's Nearby Search returns at most ~60 places
 * per query (3 pages of 20) within one radius, so a single search only sees the
 * area around one point. To cover the whole city we tile it into a GRID of
 * search points, page through each, and dedupe by place_id — turning ~20
 * results into (often) a thousand-plus live venues spread across the city. The
 * sweep is progressive: each batch of points reports its cumulative results via
 * `onPartial`, so the map/feed fill within a couple of seconds instead of after
 * the whole sweep.
 *
 * Compliance note: this fetches Places data LIVE at runtime and never stores it;
 * photos are loaded from Google's own Places Photo endpoint (via photo.getUrl)
 * with attribution, never downloaded or re-hosted.
 *
 * Requires "Places API" + "Maps JavaScript API" on the browser key (config.ts).
 * Native uses placesGoogle.ts (OSM) — the Places JS library is web-only.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { PlaceDetails } from './placeDetails';
import { loadGoogleMaps } from './googleMaps';
import { PHOTO_POOL } from '../assets';
import { cuisineFromGoogleTypes } from './cuisines';

const PRICE = ['$', '$', '$$', '$$$', '$$$$']; // Google price_level 0–4

// City-tiling knobs. GRID×GRID search points spread across ~SPAN degrees, each
// covering RADIUS metres, paged MAX_PAGES deep. Cranked for near-complete cover
// of central CDMX; every point/page is one Nearby Search request, so dialing
// these up trades quota for coverage.
const GRID = 6; // 6×6 = 36 search points
const SPAN = 0.16; // ≈ 17 km across, centred on the city
const RADIUS = 2400; // metres per point (overlaps neighbours)
const MAX_PAGES = 3; // up to 60 places per point
const CONCURRENCY = 12; // points searched per batch
const MAX_PHOTOS = 4; // live photos captured per venue (hero + gallery)

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

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
    setTimeout(done, 14000); // one hung point can't stall the sweep
  });
}

function plainAttr(html?: string): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]*>/g, '').trim() || undefined;
}

/** Dedupe raw Google results by place_id and normalize to the app's Place shape. */
function toPlaces(raw: any[], city: City): Place[] {
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

    // Real Google Maps photos, served live from Google with attribution.
    let photoUrls: string[] | undefined;
    let photoAttr: string | undefined;
    if (Array.isArray(r.photos) && r.photos.length) {
      const urls: string[] = [];
      for (const ph of r.photos.slice(0, MAX_PHOTOS)) {
        if (ph && typeof ph.getUrl === 'function') {
          try {
            urls.push(ph.getUrl({ maxWidth: 800, maxHeight: 600 }));
            if (!photoAttr) photoAttr = plainAttr(Array.isArray(ph.html_attributions) ? ph.html_attributions[0] : undefined);
          } catch {
            /* skip this photo */
          }
        }
      }
      if (urls.length) photoUrls = urls;
    }

    places.push({
      id,
      name: r.name,
      cuisine,
      hood,
      price: PRICE[priceLvl] || '$$',
      photo: PHOTO_POOL[hash(id) % PHOTO_POOL.length], // fallback only if a venue has no photos
      photoUrl: photoUrls ? photoUrls[0] : undefined,
      photoUrls,
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
}

export function googleSearchNearby(city: City, onPartial?: (places: Place[]) => void): Promise<Place[]> {
  return loadGoogleMaps().then(async (maps) => {
    const service = new maps.places.PlacesService(document.createElement('div'));
    const pts = gridPoints(city.center);
    const rawAll: any[] = [];
    for (let i = 0; i < pts.length; i += CONCURRENCY) {
      const batch = pts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((pt) => searchPoint(maps, service, pt)));
      results.forEach((r) => rawAll.push(...r));
      if (onPartial) {
        try {
          onPartial(toPlaces(rawAll, city)); // stream cumulative results as batches land
        } catch {
          /* ignore progressive-update errors */
        }
      }
    }
    return toPlaces(rawAll, city);
  });
}

/** Safe open-now read (isOpen() can throw if hours aren't loaded). */
function readOpenNow(oh: any): boolean | undefined {
  if (!oh) return undefined;
  if (typeof oh.isOpen === 'function') {
    try {
      return oh.isOpen();
    } catch {
      /* fall through */
    }
  }
  return typeof oh.open_now === 'boolean' ? oh.open_now : undefined;
}

/**
 * Live Google Place Details for one venue — full weekly hours, phone, website,
 * Google's editorial summary, and up to 5 real Google reviews. Fetched on demand
 * (when a place is opened), never stored. Resolves to {} on any failure so the
 * UI degrades gracefully. `placeId` is the raw Google place_id (no "g-" prefix).
 */
export function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  return loadGoogleMaps().then(
    (maps) =>
      new Promise<PlaceDetails>((resolve) => {
        try {
          const svc = new maps.places.PlacesService(document.createElement('div'));
          svc.getDetails(
            {
              placeId,
              fields: [
                'formatted_phone_number',
                'international_phone_number',
                'website',
                'url',
                'opening_hours',
                'rating',
                'user_ratings_total',
                'price_level',
                'reviews',
                'editorial_summary',
              ],
            },
            (res: any, status: any) => {
              if (status !== maps.places.PlacesServiceStatus.OK || !res) {
                resolve({});
                return;
              }
              const oh = res.opening_hours;
              const googleReviews = Array.isArray(res.reviews)
                ? res.reviews
                    .slice(0, 5)
                    .map((rv: any) => ({
                      author: rv.author_name,
                      authorUrl: rv.author_url,
                      photo: rv.profile_photo_url,
                      rating: typeof rv.rating === 'number' ? rv.rating : 0,
                      relativeTime: rv.relative_time_description || '',
                      text: rv.text || '',
                    }))
                    .filter((r: any) => r.text)
                : undefined;
              resolve({
                phone: res.formatted_phone_number || res.international_phone_number || undefined,
                website: res.website || undefined,
                mapsUrl: res.url || undefined,
                weekdayHours: Array.isArray(oh?.weekday_text) && oh.weekday_text.length ? oh.weekday_text : undefined,
                openNow: readOpenNow(oh),
                summary: res.editorial_summary?.overview || undefined,
                rating: typeof res.rating === 'number' ? res.rating : undefined,
                reviews: typeof res.user_ratings_total === 'number' ? res.user_ratings_total : undefined,
                priceLevel: typeof res.price_level === 'number' ? res.price_level : undefined,
                googleReviews: googleReviews && googleReviews.length ? googleReviews : undefined,
              });
            },
          );
        } catch {
          resolve({});
        }
      }),
  );
}
