/**
 * Approximate real coordinates for seed places, events, and open tables — used
 * to plot Grades / Events / Tables together on the unified map (projected onto
 * the selected city's bbox). Live OSM places already carry their own lat/lon.
 * (CDMX seed set; a real build gets these from the venue records.)
 */

export type LatLon = { lat: number; lon: number };

/** A single plotted point on the Nearby map — a restaurant grade, a community
 *  event, or an open table — shared by the native (SVG) and web (Google) map. */
export type Pin = {
  kind: 'grade' | 'event' | 'table';
  id: string;
  coord: LatLon;
  bg: string;
  fg: string;
  metric: string;
  dashed: boolean;
};

export const PLACE_COORDS: Record<string, LatLon> = {
  vilsito: { lat: 19.398, lon: -99.155 },
  rosetta: { lat: 19.419, lon: -99.161 },
  contramar: { lat: 19.417, lon: -99.165 },
  medellin: { lat: 19.41, lon: -99.163 },
  opera: { lat: 19.435, lon: -99.14 },
  moro: { lat: 19.432, lon: -99.141 },
  delirio: { lat: 19.418, lon: -99.162 },
  corazon: { lat: 19.386, lon: -99.162 },
  pujol: { lat: 19.432, lon: -99.196 },
  maximo: { lat: 19.421, lon: -99.158 },
  expendio: { lat: 19.42, lon: -99.16 },
  turix: { lat: 19.43, lon: -99.19 },
  orinoco: { lat: 19.42, lon: -99.169 },
  lardo: { lat: 19.411, lon: -99.178 },
  blanco: { lat: 19.419, lon: -99.166 },
  nin: { lat: 19.427, lon: -99.157 },
};

/** Events + open tables, keyed by their id. */
export const PIN_COORDS: Record<string, LatLon> = {
  // community events
  crawl12: { lat: 19.419, lon: -99.169 },
  tasting: { lat: 19.399, lon: -99.156 },
  mercado: { lat: 19.41, lon: -99.163 },
  // open tables
  ot1: { lat: 19.411, lon: -99.178 },
  ot2: { lat: 19.417, lon: -99.165 },
  ot3: { lat: 19.41, lon: -99.164 },
};

export function coordForId(id: string, placeId?: string): LatLon | null {
  return PIN_COORDS[id] || (placeId ? PLACE_COORDS[placeId] : null) || PLACE_COORDS[id] || null;
}
