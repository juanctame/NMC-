/**
 * Google Places provider (native shim). The Places JavaScript library only runs
 * in a browser, so on iOS/Android we serve the same "nearby restaurants" request
 * from OpenStreetMap. A real native build would swap this for the Places SDK /
 * a backend proxy behind the identical signature.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { fetchOsmNearby } from './osm';

export function googleSearchNearby(city: City): Promise<Place[]> {
  return fetchOsmNearby(city);
}
