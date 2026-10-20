/**
 * House critics — real people whose scores are their own (not CRTQ's simulated
 * reading of someone's content, like critics.ts). Each has a list from the app
 * they rank in (Beli for @tametitoeats), committed in src/data/critics/*.json
 * after it's imported from their own screenshots or export, and — when they
 * keep a CRTQ passport under the same handle — read live from it, so their
 * critic page always shows their current list.
 */
import type { Place } from '../store/data';
import { byId as seedById } from '../store/data';
import { CARTE_CDMX } from './carte';
import { PHOTO_POOL } from '../assets';
import { SUPABASE_URL } from '../config';
import { cloudConfigured, readHeaders, timed } from './cloud';
import TAME from './critics/tametitoeats.json';

export type HouseEntry = {
  id?: string;
  placeId?: string; // the guide's page, when the place is in the guide
  name: string;
  score?: number;
  hood?: string;
  note?: string; // their own words about it
  list?: 'been' | 'want' | 'map' | 'rec'; // rec: a written recommendation (World of Mouth)
  source?: string; // the app it came from, for recs
  // from a map they keep (Google My Maps)
  kind?: string;
  borough?: string;
  city?: string;
  state?: string;
  address?: string;
  lat?: number;
  lon?: number;
  precision?: 'pin' | 'address' | 'name' | 'area';
  gid?: string; // Google place id
  instagram?: string;
  link?: string;
  status?: string;
};
export type HouseMap = {
  title: string;
  folder?: string;
  url: string;
  count: number;
  source: string;
};
export type HouseCritic = {
  id: string;
  name: string;
  handle: string;
  photo?: string;
  bio?: string; // as they describe themselves on their own profile
  links: { platform: string; url: string }[];
  city: string;
  source: string; // where the scored list comes from ("Beli")
  asOf: string | null;
  list: HouseEntry[];
  maps?: HouseMap[];
};

export const HOUSE_CRITICS: HouseCritic[] = [TAME as HouseCritic];
export const houseCriticById = (id?: string | null) => HOUSE_CRITICS.find((c) => c.id === id);

const guideById: Record<string, Place> = Object.fromEntries(CARTE_CDMX.map((p) => [p.id, p]));

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const mapTitle = (c: HouseCritic) => {
  const m = c.maps?.[0];
  if (!m) return 'their map';
  return m.title.replace(/\s*-\s*/g, ' — ').replace(/\b([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]+)\b/g, (w, a, b) => (w.length <= 4 ? w : a + b.toLowerCase()));
};

/** A place from their map that isn't in the guide, as a page of its own. */
function mapPlace(c: HouseCritic, e: HouseEntry): Place | undefined {
  if (!e.id) return undefined;
  const where = [e.hood, e.city].filter(Boolean).join(', ');
  return {
    id: e.id,
    name: e.name,
    cuisine: e.kind || 'Café',
    hood: e.hood || e.city || '',
    price: '',
    photo: PHOTO_POOL[hash(e.id) % PHOTO_POOL.length],
    addr: e.address || where,
    blurb: e.note || `On ${c.name}’s map — ${mapTitle(c)}${where ? `, in ${where}` : ''}.`,
    openInfo: e.precision === 'area' ? 'Location approximate (colonia)' : e.lat == null ? 'See the address' : '',
    ...(e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : {}),
    source: 'google',
    rated: false,
    ...(e.instagram ? { instagram: e.instagram } : {}),
    ...(e.borough ? { borough: e.borough } : {}),
    sources: [...(c.maps?.[0]?.url ? [{ outlet: `${c.name}’s map`, url: c.maps[0].url }] : []), ...(e.link ? [{ outlet: 'Instagram', url: e.link }] : [])],
  };
}

const built: Record<string, Place | undefined> = {};
export const placeOf = (e: HouseEntry, c: HouseCritic = HOUSE_CRITICS[0]): Place | undefined => {
  const guide = e.placeId ? guideById[e.placeId] || seedById[e.placeId] : undefined;
  if (guide || !e.id) return guide;
  if (!(e.id in built)) built[e.id] = mapPlace(c, e);
  return built[e.id];
};

/** Every map place and recommendation that needs its own page (so it opens from anywhere). */
export const houseMapPlaces = (): Place[] =>
  HOUSE_CRITICS.flatMap((c) =>
    c.list
      .filter((e) => (e.list === 'map' || e.list === 'rec') && !e.placeId)
      .map((e) => placeOf(e, c))
      .filter((p): p is Place => !!p),
  );

/** Their map, by city — the biggest first, home city on top. */
export function mapByCity(c: HouseCritic): { city: string; label: string; entries: HouseEntry[] }[] {
  const groups: Record<string, { city: string; label: string; entries: HouseEntry[] }> = {};
  for (const e of c.list) {
    if (e.list !== 'map') continue;
    const city = e.city || 'Elsewhere';
    const key = city
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^heroica /, '');
    const label = /^ciudad de mexico$/.test(key)
      ? 'CDMX'
      : city
          .replace(/^Heroica /, '')
          .replace(/^Santiago de /, '')
          .replace(/ de Zaragoza$/, '');
    (groups[key] = groups[key] || { city, label, entries: [] }).entries.push(e);
  }
  const home = (g: { label: string }) => (g.label === 'CDMX' ? 1 : 0);
  return Object.values(groups)
    .map((g) => ({
      ...g,
      entries: g.entries.sort((a, b) => (a.hood ? 0 : 1) - (b.hood ? 0 : 1) || (a.hood || '').localeCompare(b.hood || '', 'es') || a.name.localeCompare(b.name, 'es')),
    }))
    .sort((a, b) => home(b) - home(a) || b.entries.length - a.entries.length || a.label.localeCompare(b.label, 'es'));
}
export const mapEntries = (c: HouseCritic) => c.list.filter((e) => e.list === 'map');
export { mapTitle };

/** Their been-list, best first. */
export const beenOf = (c: HouseCritic, list = c.list) => list.filter((e) => e.list !== 'want' && e.score != null).sort((a, b) => (b.score || 0) - (a.score || 0));

/** Their current list from their CRTQ passport (same handle), when the backend has it. */
export async function fetchLiveList(c: HouseCritic): Promise<HouseEntry[] | null> {
  if (!cloudConfigured()) return null;
  try {
    const h = await readHeaders();
    const pr = await timed(`${SUPABASE_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(c.handle)}&select=user_id&limit=1`, { headers: h });
    const uid = pr?.ok ? (await pr.json())?.[0]?.user_id : null;
    if (!uid) return null;
    const rr = await timed(`${SUPABASE_URL}/rest/v1/rankings?user_id=eq.${uid}&select=place_id,place_name,score,position&order=position.asc&limit=500`, { headers: h });
    if (!rr?.ok) return null;
    const rows = (await rr.json()) as {
      place_id: string;
      place_name: string | null;
      score: number | null;
    }[];
    return rows.map((r) => ({
      placeId: r.place_id,
      name: r.place_name || r.place_id,
      score: r.score != null ? Number(r.score) : undefined,
      list: 'been' as const,
    }));
  } catch {
    return null;
  }
}
