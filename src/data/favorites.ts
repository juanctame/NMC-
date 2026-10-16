/**
 * Favourites — who loves a restaurant most, category by category.
 *
 * A person's favourite in a category (tacos, seafood, fine dining…) is the
 * restaurant they rank highest in it, so favourites fall straight out of
 * everyone's rankings. On top of that, everyone features four restaurants as
 * their "Top 4" on their profile. A restaurant's "Biggest fans" are the people
 * whose favourite it is, in each category, flagging who also features it.
 *
 * People: you (from your rankings + your Top 4), your friends in the app (from
 * their taste profiles — the app's demo community), and — when the shared
 * backend has a `favorites` table (SHARED_DEMO.md) — every other tester's
 * published favourites. Real critics never get favourites put in their mouths.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../store/data';
import { FRIENDS, byId as seedById } from '../store/data';
import { CARTE_CDMX } from './carte';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { sharedEnabled } from './shared';

export type FavCat = 'tacos' | 'seafood' | 'fine' | 'mexican' | 'cafe' | 'bar' | 'world';

export const FAV_CATS: { id: FavCat; label: string; es: string; glyph: string }[] = [
  { id: 'tacos', label: 'Tacos & street', es: 'Tacos y calle', glyph: '◆' },
  { id: 'mexican', label: 'Mexican kitchen', es: 'Cocina mexicana', glyph: '▲' },
  { id: 'seafood', label: 'Seafood', es: 'Mariscos', glyph: '≈' },
  { id: 'fine', label: 'Fine dining', es: 'Alta cocina', glyph: '○' },
  { id: 'cafe', label: 'Bakery & café', es: 'Pan y café', glyph: '✿' },
  { id: 'bar', label: 'Bars & mezcal', es: 'Barras y mezcal', glyph: '◇' },
  { id: 'world', label: 'Around the world', es: 'Del mundo', glyph: '★' },
];
export const catLabel = (c: FavCat) => FAV_CATS.find((x) => x.id === c)?.label || c;

const fold = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** The favourite category a restaurant competes in. */
export function categoryOf(p: Pick<Place, 'name' | 'cuisine' | 'price'> & { category?: string; awards?: string }): FavCat {
  const t = fold([p.category, p.cuisine, p.name].filter(Boolean).join(' '));
  if (/panader|bakery|pasteler|cafe|cafeteria|brunch|desayun|dessert|postre/.test(t)) return 'cafe';
  if (/\bbar\b|mezcal|cantina|vino|wine|cocktail|coctel|pulque|cerveza/.test(t)) return 'bar';
  if (/seafood|marisc|pescad|ostion|ceviche|oyster|mar y |del mar/.test(t)) return 'seafood';
  if (/taquer|tacos?\b|antojit|garnacha|torta|canasta|barbacoa|birria|carnitas|street/.test(t)) return 'tacos';
  if (p.price === '$$$$' || /fine dining|alta cocina|degustaci|estrella/.test(t) || /estrella/i.test(p.awards || '')) return 'fine';
  if (/mexican|mexicana|oaxaque|yucat|fonda|poblan|veracruz|regional/.test(t)) return 'mexican';
  return 'world';
}

/** Your favourite in each category: the restaurant you rank highest there. */
export function favoritesFromRanked(ranked: Place[]): Partial<Record<FavCat, Place>> {
  const out: Partial<Record<FavCat, Place>> = {};
  ranked.forEach((p, i) => {
    const c = categoryOf(p);
    const cur = out[c];
    const score = typeof p.score === 'number' ? p.score : 10 - i * 0.01;
    const curScore = cur ? (typeof cur.score === 'number' ? cur.score : 10 - ranked.indexOf(cur) * 0.01) : -1;
    if (!cur || score > curScore) out[c] = p;
  });
  return out;
}

// ── your Top 4 ──────────────────────────────────────────────────────────────

export type TopPick = { placeId: string; category: FavCat };
export type TopFour = (TopPick | null)[]; // always 4 slots

export const emptyTopFour = (): TopFour => [null, null, null, null];

const KEY = 'nmc.top4.v1';
export async function loadTopFour(): Promise<TopFour> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as TopFour) : null;
    return Array.isArray(v) && v.length === 4 ? v : emptyTopFour();
  } catch {
    return emptyTopFour();
  }
}
export async function saveTopFour(t: TopFour): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // non-fatal
  }
}

// ── friends (the app's demo community) ──────────────────────────────────────

/** Which categories each friend cares about most (from their taste leans in palate.ts). */
const FRIEND_CATS: Record<string, FavCat[]> = {
  rm: ['tacos', 'mexican', 'bar', 'seafood'],
  df: ['cafe', 'tacos', 'world', 'mexican'],
  ml: ['cafe', 'world', 'fine', 'seafood'],
  sr: ['fine', 'seafood', 'world', 'mexican'],
  av: ['tacos', 'bar', 'cafe', 'mexican'],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

const ALL_PLACES: Place[] = [...CARTE_CDMX];
const byCat: Partial<Record<FavCat, Place[]>> = {};
ALL_PLACES.forEach((p) => (byCat[categoryOf(p)] = byCat[categoryOf(p)] || []).push(p));

export type Fan = {
  id: string; // friend id, 'me', or 'h:<handle>'
  name: string;
  initials: string;
  color: string;
  avatarUrl?: string;
  kind: 'me' | 'friend' | 'community';
};

export type PersonFavs = { person: Fan; favorites: Partial<Record<FavCat, string>>; top: TopFour };

/**
 * Each friend's favourite in every category (their best-loved by acclaim and
 * taste, varied per friend) and their Top 4: the favourites of the categories
 * they care about most.
 */
const FRIEND_FAVS: PersonFavs[] = FRIENDS.map((f) => {
  const favorites: Partial<Record<FavCat, string>> = {};
  for (const c of FAV_CATS) {
    const pool = byCat[c.id] || [];
    let best: Place | undefined;
    let bestScore = -1;
    for (const p of pool) {
      const s = (p.acclaim || 30) * 0.5 + hash(f.id + p.id) * 60;
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (best) favorites[c.id] = best.id;
  }
  const cats = FRIEND_CATS[f.id] || ['tacos', 'mexican', 'seafood', 'world'];
  const top: TopFour = cats.slice(0, 4).map((c) => (favorites[c] ? { placeId: favorites[c]!, category: c } : null));
  return { person: { id: f.id, name: f.name, initials: f.initials, color: f.color, kind: 'friend' as const }, favorites, top };
});

export const friendFavs = (id: string) => FRIEND_FAVS.find((x) => x.person.id === id);

// ── the shared backend (optional) ───────────────────────────────────────────

type FavRow = { handle: string; name: string; initials?: string; color?: string; avatar_url?: string; place_id: string; category: FavCat; featured: boolean };

/** Publish your favourites + Top 4 so other testers see you among a place's fans. No-op without the table. */
export async function publishFavorites(me: { handle: string; name: string; initials: string; color: string; avatarUrl?: string }, favs: Partial<Record<FavCat, Place>>, top: TopFour): Promise<void> {
  if (!sharedEnabled() || !me.handle) return;
  const featured = new Set(top.filter(Boolean).map((t) => t!.placeId));
  const rows: FavRow[] = [];
  const seen = new Set<string>();
  (Object.entries(favs) as [FavCat, Place][]).forEach(([c, p]) => {
    rows.push({ handle: me.handle, name: me.name, initials: me.initials, color: me.color, avatar_url: me.avatarUrl, place_id: p.id, category: c, featured: featured.has(p.id) });
    seen.add(p.id + c);
  });
  top.forEach((t) => {
    if (t && !seen.has(t.placeId + t.category)) rows.push({ handle: me.handle, name: me.name, initials: me.initials, color: me.color, avatar_url: me.avatarUrl, place_id: t.placeId, category: t.category, featured: true });
  });
  const h = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
  try {
    // Replace this person's rows wholesale (their favourites change as they rank).
    await fetch(`${SUPABASE_URL}/rest/v1/favorites?handle=eq.${encodeURIComponent(me.handle)}`, { method: 'DELETE', headers: h });
    if (rows.length) await fetch(`${SUPABASE_URL}/rest/v1/favorites`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  } catch {
    // best effort
  }
}

/** Other testers who have this place as a favourite (or featured). [] without the table. */
export async function fetchSharedFans(placeId: string, exceptHandle?: string): Promise<{ fan: Fan; category: FavCat; featured: boolean }[]> {
  if (!sharedEnabled()) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/favorites?place_id=eq.${encodeURIComponent(placeId)}&select=*&limit=60`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as FavRow[];
    return (Array.isArray(rows) ? rows : [])
      .filter((r) => r.handle !== exceptHandle)
      .map((r) => ({
        fan: { id: 'h:' + r.handle, name: r.name, initials: r.initials || r.name.slice(0, 2).toUpperCase(), color: r.color || 'var(--ink-400)', avatarUrl: r.avatar_url, kind: 'community' as const },
        category: r.category,
        featured: !!r.featured,
      }));
  } catch {
    return [];
  }
}

// ── a restaurant's biggest fans ─────────────────────────────────────────────

export type FanEntry = { fan: Fan; featured: boolean; slot?: number };
export type FanGroup = { category: FavCat; fans: FanEntry[] };

/**
 * Everyone whose favourite this place is, grouped by category — you first,
 * then friends, then the community; people who feature it in their Top 4 lead
 * within each group.
 */
export function fansOf(
  placeId: string,
  me: { fan: Fan; favorites: Partial<Record<FavCat, Place>>; top: TopFour } | null,
  shared: { fan: Fan; category: FavCat; featured: boolean }[] = [],
): FanGroup[] {
  const groups: Partial<Record<FavCat, FanEntry[]>> = {};
  const add = (c: FavCat, e: FanEntry) => {
    const g = (groups[c] = groups[c] || []);
    if (!g.some((x) => x.fan.id === e.fan.id)) g.push(e);
  };
  const people: { fan: Fan; favs: Partial<Record<FavCat, string>>; top: TopFour }[] = [];
  if (me) {
    const favs: Partial<Record<FavCat, string>> = {};
    (Object.entries(me.favorites) as [FavCat, Place][]).forEach(([c, p]) => (favs[c] = p.id));
    people.push({ fan: me.fan, favs, top: me.top });
  }
  FRIEND_FAVS.forEach((f) => people.push({ fan: f.person, favs: f.favorites, top: f.top }));
  for (const p of people) {
    const slot = p.top.findIndex((t) => t?.placeId === placeId);
    (Object.entries(p.favs) as [FavCat, string][]).forEach(([c, id]) => {
      if (id === placeId) add(c, { fan: p.fan, featured: slot >= 0, slot: slot >= 0 ? slot : undefined });
    });
    // Featured in their Top 4 under a category it isn't (yet) their ranked favourite in.
    p.top.forEach((t, i) => {
      if (t?.placeId === placeId) add(t.category, { fan: p.fan, featured: true, slot: i });
    });
  }
  shared.forEach((s) => add(s.category, { fan: s.fan, featured: s.featured }));
  const order = (e: FanEntry) => (e.fan.kind === 'me' ? 0 : e.featured ? 1 : e.fan.kind === 'friend' ? 2 : 3);
  return FAV_CATS.filter((c) => groups[c.id]?.length).map((c) => ({ category: c.id, fans: groups[c.id]!.sort((a, b) => order(a) - order(b)) }));
}

/** Resolve a place id from the guide or the seed data. */
export const favPlace = (id: string): Place | undefined => ALL_PLACES.find((p) => p.id === id) || seedById[id];
