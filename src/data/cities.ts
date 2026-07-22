/**
 * Selectable cities. Each carries a real center + a dining-core bounding box
 * [south, west, north, east] used to (a) query a provider for nearby places and
 * (b) project real lat/lon onto the stylized map. NO MAD CORNER is a global,
 * "around the world" brand, so the seed set spans its home base and the cities
 * its dossier name-checks.
 */

export type City = {
  id: string;
  name: string;
  country: string;
  flag: string;
  center: { lat: number; lon: number };
  /** [south, west, north, east] */
  bbox: [number, number, number, number];
  defaultHood: string;
  weather: string; // shown in headers until a real weather source is wired
};

export const CITIES: City[] = [
  {
    id: 'cdmx',
    name: 'CDMX',
    country: 'Mexico',
    flag: '🇲🇽',
    center: { lat: 19.4194, lon: -99.1605 },
    bbox: [19.38, -99.2, 19.46, -99.1],
    defaultHood: 'Roma · Condesa',
    weather: '24°C, sun',
  },
  {
    id: 'mty',
    name: 'Monterrey',
    country: 'Mexico',
    flag: '🇲🇽',
    center: { lat: 25.6714, lon: -100.3094 },
    bbox: [25.63, -100.38, 25.71, -100.26],
    defaultHood: 'Centro · Del Valle',
    weather: '31°C, clear',
  },
  {
    id: 'gdl',
    name: 'Guadalajara',
    country: 'Mexico',
    flag: '🇲🇽',
    center: { lat: 20.6668, lon: -103.3556 },
    bbox: [20.63, -103.41, 20.71, -103.31],
    defaultHood: 'Centro · Lafayette',
    weather: '26°C, sun',
  },
  {
    id: 'nyc',
    name: 'New York',
    country: 'USA',
    flag: '🇺🇸',
    center: { lat: 40.7239, lon: -73.9945 },
    bbox: [40.7, -74.02, 40.75, -73.97],
    defaultHood: 'SoHo · LES',
    weather: '19°C, cloud',
  },
  {
    id: 'tyo',
    name: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    center: { lat: 35.68, lon: 139.715 },
    bbox: [35.66, 139.69, 35.7, 139.74],
    defaultHood: 'Shibuya · Shinjuku',
    weather: '22°C, rain',
  },
];

export const DEFAULT_CITY = CITIES[0];

export function cityById(id: string): City {
  return CITIES.find((c) => c.id === id) ?? DEFAULT_CITY;
}

/** Project a real coordinate to an x%/y% position inside the city's bbox. */
export function projectToBox(
  lat: number,
  lon: number,
  bbox: [number, number, number, number],
): { x: number; y: number; inside: boolean } {
  const [s, w, n, e] = bbox;
  const x = ((lon - w) / (e - w)) * 100;
  const y = ((n - lat) / (n - s)) * 100;
  const inside = x >= 0 && x <= 100 && y >= 0 && y <= 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), inside };
}
