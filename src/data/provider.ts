/**
 * The swappable places-provider seam — the app asks a provider for "eateries
 * near a city" and never knows the source. This is the standardization: one
 * interface, many backends. Google Places drops in here later with the same
 * signature.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { fetchOsmNearby, osmNormalize } from './osm';
import { CDMX_FIXTURE } from './fixtures';
import { googleSearchNearby } from './placesGoogle';
import { DATA_SOURCE, GOOGLE_PLACES_API_KEY } from './config';

export type PlacesProvider = {
  id: string;
  label: string;
  /**
   * Real places near a city, normalized to the app's Place shape. `onPartial`
   * (when supported) streams cumulative results as they arrive, so the UI can
   * fill progressively during a long city sweep.
   */
  searchNearby: (city: City, onPartial?: (places: Place[]) => void) => Promise<Place[]>;
};

const overpassProvider: PlacesProvider = {
  id: 'overpass',
  label: 'OpenStreetMap',
  searchNearby: (city) => fetchOsmNearby(city),
};

const fixtureProvider: PlacesProvider = {
  id: 'fixture',
  label: 'Offline sample',
  searchNearby: async (city) => osmNormalize(CDMX_FIXTURE, city),
};

const googleProvider: PlacesProvider = {
  id: 'google',
  label: 'Google Places',
  // Web: live Google Places Nearby Search. Native: OSM (Places JS is web-only).
  searchNearby: (city, onPartial) => googleSearchNearby(city, onPartial),
};

export function getProvider(): PlacesProvider {
  switch (DATA_SOURCE) {
    case 'fixture':
      return fixtureProvider;
    case 'google':
      return GOOGLE_PLACES_API_KEY ? googleProvider : overpassProvider;
    case 'overpass':
    default:
      return overpassProvider;
  }
}

/** Last-resort content so CDMX is never empty if every endpoint is unreachable. */
export function fixtureFallback(city: City): Place[] {
  return osmNormalize(CDMX_FIXTURE, city);
}

export { overpassProvider, fixtureProvider, googleProvider };
