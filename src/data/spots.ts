/**
 * Discovered spots — what the city-wide sweep found (scripts/discover-spots.mjs):
 * every new, talked-about or diner-suggested place to eat, plus independent
 * spots with enough detail to recommend. Read fresh from the published site on
 * every launch (the sweep re-runs on each deploy), kept on the device for
 * offline use, and turned into ordinary places the app can open, rank and
 * save. Facts only — what OpenStreetMap, the press and diners say; no made-up
 * ratings.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../store/data';
import { PHOTO_POOL } from '../assets';
import { freshJson } from './live';

export type Spot = {
  id: string;
  n: string;
  la: number;
  lo: number;
  k: string;
  c?: string[];
  h?: string;
  a?: string;
  w?: string;
  ig?: string;
  oh?: string;
  ph?: string;
  img?: string;
  imgSrc?: string;
  chain?: string | boolean;
  sd?: string;
  guide?: string;
  new?: { since: string | null; why: string[] };
  buzz?: { title: string; link?: string; source?: string; date?: string }[];
  sug?: { at: string; note?: string };
  vegan?: boolean;
  out?: boolean;
  ps?: number;
};

export type SpotFeed = { generated_at: string; city: string; spots: Spot[] };

const CACHE = 'nmc.spots.v1';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const title = (s: string) => s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function daysAgo(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 864e5));
}

/** The one line that says why this spot is in front of you. */
export function spotReason(s: Spot): string {
  if (s.sug) return 'Found by a diner';
  if (s.buzz?.length) return `In the news · ${s.buzz[0].source || 'press'}`;
  if (s.new) {
    const d = daysAgo(s.new.since);
    const why = s.new.why[0] || 'new';
    return d != null && d <= 60 ? `${cap(why)} · ${d === 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'}` : cap(why);
  }
  return 'Off the beaten path';
}

/** A discovered spot as a place the app can show, open, rank and save. */
export function spotToPlace(s: Spot): Place {
  const kind = s.c?.length ? `${title(s.c[0])} · ${s.k}` : s.k;
  const facts = [
    s.new ? spotReason(s) + '.' : '',
    s.buzz?.length ? `“${s.buzz[0].title}”` : '',
    s.sug?.note ? `A diner says: “${s.sug.note}”` : '',
    s.vegan ? 'Vegan options.' : '',
    s.out ? 'Outdoor seating.' : '',
  ].filter(Boolean);
  return {
    id: s.id,
    name: s.n,
    cuisine: kind,
    hood: s.h || '',
    price: '',
    photo: PHOTO_POOL[hash(s.id) % PHOTO_POOL.length],
    ...(s.img ? { photoUrl: s.img, photoAttr: s.imgSrc || 'OpenStreetMap' } : {}),
    addr: s.a || '',
    blurb: facts.join(' ') || `${kind}${s.h ? ' in ' + s.h : ''}, from the city-wide sweep.`,
    openInfo: s.oh || '',
    lat: s.la,
    lon: s.lo,
    source: 'osm',
    rated: false,
    ...(s.w ? { website: s.w } : {}),
    ...(s.ig ? { instagram: s.ig } : {}),
    ...(s.ph ? { phone: s.ph } : {}),
    ...(s.buzz?.length ? { sources: s.buzz.filter((b) => b.link).map((b) => ({ outlet: b.source || 'Press', url: b.link! })) } : {}),
  };
}

let memo: SpotFeed | null = null;

/** The latest discovery pool: fresh from the site, else the copy on the device. */
export async function loadSpotFeed(): Promise<SpotFeed | null> {
  const fresh = await freshJson<SpotFeed>('data/spots-new.json', 15000);
  if (fresh?.spots?.length) {
    memo = fresh;
    try {
      await AsyncStorage.setItem(CACHE, JSON.stringify(fresh));
    } catch {
      // too big for this browser's storage: fine, it's re-fetched next time
    }
    return fresh;
  }
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(CACHE);
    memo = raw ? (JSON.parse(raw) as SpotFeed) : null;
  } catch {
    memo = null;
  }
  return memo;
}

let allMemo: Spot[] | null = null;

/**
 * Every spot the sweep knows (all map tiles, ~6k) — loaded only when needed,
 * e.g. to recognise the places in an imported list. Falls back to the pool.
 */
export async function loadAllSpots(): Promise<Spot[]> {
  if (allMemo) return allMemo;
  const idx = await freshJson<{ tiles?: Record<string, number> }>('data/spots-index.json', 15000);
  const keys = Object.keys(idx?.tiles || {});
  const out: Spot[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (i < keys.length) {
        const k = keys[i++];
        const t = await freshJson<Spot[]>(`data/spots/${k}.json`, 15000);
        if (Array.isArray(t)) out.push(...t);
      }
    }),
  );
  if (!out.length) out.push(...((await loadSpotFeed())?.spots || []));
  allMemo = out;
  return out;
}
