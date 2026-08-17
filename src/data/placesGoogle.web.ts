/**
 * Google Places provider (web) — pulls real, current restaurants near the
 * selected city with a Places Nearby Search and normalizes them to the app's
 * Place shape. This is what keeps the map fresh: instead of a short fixed seed
 * list, the area fills with live venues, ranked so the most-reviewed and
 * best-rated (the trending ones) come first.
 *
 * Requires the "Places API" enabled on the browser key (see src/config.ts).
 * Native uses placesGoogle.ts (OSM) since the Places JS library is web-only.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { loadGoogleMaps } from './googleMaps';
import { PHOTO_POOL } from '../assets';
import { cuisineFromGoogleTypes } from './cuisines';

const PRICE = ['$', '$', '$$', '$$$', '$$$$']; // Google price_level 0–4

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function googleSearchNearby(city: City): Promise<Place[]> {
  return loadGoogleMaps().then(
    (maps) =>
      new Promise<Place[]>((resolve, reject) => {
        const service = new maps.places.PlacesService(document.createElement('div'));
        const request = {
          location: new maps.LatLng(city.center.lat, city.center.lon),
          radius: 2600,
          type: 'restaurant',
        };
        service.nearbySearch(request, (results: any[], status: any) => {
          if (status !== maps.places.PlacesServiceStatus.OK || !Array.isArray(results)) {
            reject(new Error('Places nearbySearch failed: ' + status));
            return;
          }
          const places: Place[] = results
            .filter((r) => r.geometry?.location && (!r.business_status || r.business_status === 'OPERATIONAL'))
            .map((r) => {
              const id = 'g-' + r.place_id;
              const cuisine = cuisineFromGoogleTypes(r.types);
              const hood = r.vicinity ? r.vicinity.split(',').slice(-1)[0].trim() || city.defaultHood : city.defaultHood;
              const priceLvl = typeof r.price_level === 'number' ? r.price_level : 1;
              return {
                id,
                name: r.name,
                cuisine,
                hood,
                price: PRICE[priceLvl] || '$$',
                photo: PHOTO_POOL[hash(id) % PHOTO_POOL.length],
                addr: r.vicinity || r.name,
                blurb: `${cuisine} near ${hood}. Straight from Google Maps — be the first of us to rank it.`,
                openInfo: r.opening_hours ? (r.opening_hours.open_now ? 'Open now' : 'Closed now') : '',
                lat: r.geometry.location.lat(),
                lon: r.geometry.location.lng(),
                source: 'google' as const,
                rated: false,
                rating: typeof r.rating === 'number' ? r.rating : undefined,
                reviews: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : undefined,
              };
            })
            // Trending first: weight rating by how many people rated it.
            .sort((a, b) => (b.reviews || 0) * (b.rating || 0) - (a.reviews || 0) * (a.rating || 0));
          resolve(places);
        });
      })
  );
}
