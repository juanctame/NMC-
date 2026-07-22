/**
 * Data-source configuration. Flip DATA_SOURCE to change where live places come
 * from without touching any screen. 'overpass' is the shipped default (free,
 * keyless OpenStreetMap). 'google' activates once GOOGLE_PLACES_API_KEY is set
 * (photos + ratings); until then it transparently falls back to Overpass.
 */
export type DataSource = 'overpass' | 'fixture' | 'google';

export const DATA_SOURCE: DataSource = 'overpass';

/** Set this (or wire a backend proxy) to enable the Google Places provider. */
export const GOOGLE_PLACES_API_KEY = '';
