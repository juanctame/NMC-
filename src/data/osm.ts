/**
 * OpenStreetMap / Overpass integration. Keyless, free, worldwide coverage of
 * restaurants, cafés, food courts, and street-food stalls. `osmNormalize` is a
 * pure function (unit-testable offline) that maps raw Overpass elements to the
 * app's Place shape. OSM carries no photos/ratings, so those are left absent
 * (the UI shows an unrated state) and a brand placeholder photo is assigned.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { PHOTO_POOL } from '../assets';

export type OsmTags = Record<string, string>;
export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

export const OSM_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Build an Overpass QL query for eateries within a [s,w,n,e] bbox. */
export function buildOverpassQuery(bbox: [number, number, number, number], limit = 120): string {
  const b = bbox.join(',');
  const kinds = ['restaurant', 'fast_food', 'cafe', 'food_court'];
  const clauses = kinds
    .map((k) => `node["amenity"="${k}"]["name"](${b});way["amenity"="${k}"]["name"](${b});`)
    .join('');
  return `[out:json][timeout:25];(${clauses});out center ${limit};`;
}

function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AMENITY_CUISINE: Record<string, string> = {
  fast_food: 'Street food',
  cafe: 'Café',
  food_court: 'Food court',
  restaurant: 'Restaurant',
};

const AMENITY_PRICE: Record<string, string> = {
  fast_food: '$',
  cafe: '$',
  food_court: '$',
  restaurant: '$$',
};

function cuisineOf(tags: OsmTags): string {
  if (tags.cuisine) {
    const first = tags.cuisine.split(/[;,]/)[0].trim();
    if (first) return titleCase(first);
  }
  return AMENITY_CUISINE[tags.amenity] || 'Restaurant';
}

function addrOf(tags: OsmTags): string {
  const street = tags['addr:street'];
  const num = tags['addr:housenumber'];
  if (street) return [street, num].filter(Boolean).join(' ');
  return tags['addr:full'] || '';
}

function hoursOf(tags: OsmTags): string {
  const oh = tags.opening_hours;
  if (!oh) return '';
  if (/24\/7/.test(oh)) return '24 hours';
  return oh.length > 40 ? oh.slice(0, 40) + '…' : oh;
}

/** Pure: Overpass elements → deduped, named Place[] for a city. */
export function osmNormalize(elements: OsmElement[], city: City): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const id = `osm-${el.type[0]}${el.id}`;
    if (seen.has(id)) continue;
    const nameKey = name.toLowerCase() + '@' + lat.toFixed(4) + ',' + lon.toFixed(4);
    if (seen.has(nameKey)) continue;
    seen.add(id);
    seen.add(nameKey);

    const cuisine = cuisineOf(tags);
    const hood = tags['addr:neighbourhood'] || tags['addr:suburb'] || tags['addr:district'] || city.defaultHood;
    const photo = PHOTO_POOL[hash(id) % PHOTO_POOL.length];
    const blurb =
      tags.description ||
      `${cuisine} spot near ${hood}. Fresh from the map — be the first of us to rank it.`;

    out.push({
      id,
      name,
      cuisine,
      hood,
      price: tags['addr:price'] || AMENITY_PRICE[tags.amenity] || '$$',
      photo,
      addr: addrOf(tags),
      blurb,
      openInfo: hoursOf(tags),
      website: tags.website || tags['contact:website'] || undefined,
      lat,
      lon,
      source: 'osm',
      rated: false,
    });
  }
  return out;
}

/** Fetch nearby eateries for a city from Overpass (tries endpoints in order). */
export async function fetchOsmNearby(city: City, limit = 120): Promise<Place[]> {
  const query = buildOverpassQuery(city.bbox, limit);
  let lastErr: unknown = null;
  for (const url of OSM_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = (await res.json()) as { elements?: OsmElement[] };
      const places = osmNormalize(json.elements || [], city);
      if (places.length) return places;
      // empty but valid → try next endpoint before giving up
      lastErr = new Error('no results');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Overpass unavailable');
}
