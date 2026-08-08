/**
 * Data-source configuration. Flip DATA_SOURCE to change where live places come
 * from without touching any screen. 'google' pulls live, current restaurants
 * from Google Places on web (real ratings + review counts, ranked by what's
 * trending); native and any failure transparently fall back to OpenStreetMap /
 * the offline sample, so the map is never empty.
 *
 * The Places provider reuses the browser Maps key — enable the "Places API" on
 * that key in the Google Cloud console (same referrer restriction as Maps).
 */
import { GOOGLE_MAPS_API_KEY } from '../config';

export type DataSource = 'overpass' | 'fixture' | 'google';

export const DATA_SOURCE: DataSource = 'google';

/** Enables the Google Places provider; reuses the referrer-restricted Maps key. */
export const GOOGLE_PLACES_API_KEY = GOOGLE_MAPS_API_KEY;
