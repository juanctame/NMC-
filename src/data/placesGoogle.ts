/**
 * Google Places provider (native shim). The Places JavaScript library only runs
 * in a browser, so on iOS/Android we serve the same "nearby restaurants" request
 * from OpenStreetMap. A real native build would swap this for the Places SDK /
 * a backend proxy behind the identical signature.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { PlaceDetails } from './placeDetails';
import { fetchOsmNearby } from './osm';

export function googleSearchNearby(
  city: City,
  _onPartial?: (places: Place[]) => void
): Promise<Place[]> {
  return fetchOsmNearby(city);
}

/** Native shim: the Place Details lookup is web-only (Places JS library). */
export function getPlaceDetails(_placeId: string): Promise<PlaceDetails> {
  return Promise.resolve({});
}

/** Native shim: nearest-restaurant lookup is web-only (Places JS library). */
export function findNearest(_lat: number, _lon: number): Promise<Place | null> {
  return Promise.resolve(null);
}
