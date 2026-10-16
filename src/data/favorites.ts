/**
 * Favourites — who loves a restaurant most, category by category.
 *
 * A person's favourite in a category (tacos, seafood, fine dining…) is the
 * restaurant they rank highest in it, so favourites fall straight out of
 * everyone's rankings. On top of that, everyone features four restaurants as
 * their "Top 4" on their profile. A restaurant's "Biggest fans" are the people
 * whose favourite it is, in each category, flagging who also features it;
 * its "supporters" are the people who keep it on their shortlist there — their
 * Nº2 to Nº8 in that category — the regulars just behind the crown. A chef's
 * fans are the people who crown, feature or rank one of their kitchens in
 * their top three (friends also follow the chefs whose kitchens they keep
 * going back to).
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
import { CHEFS, type Chef } from './chefs';
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

/** How deep a shortlist runs: your favourite plus the runners-up behind it. */
export const SHORTLIST = 8;
/** Ranked this high (or crowned, or featured), you're a fan of the chef behind it. */
export const FOLLOW_RANK = 3;

/** Your shortlist in each category: the restaurants you rank highest there, best first. */
export function lovesFromRanked(ranked: Place[]): Partial<Record<FavCat, Place[]>> {
  const out: Partial<Record<FavCat, Place[]>> = {};
  const scoreOf = (p: Place) => (typeof p.score === 'number' ? p.score : 10 - ranked.indexOf(p) * 0.01);
  ranked.forEach((p) => (out[categoryOf(p)] = out[categoryOf(p)] || []).push(p));
  (Object.keys(out) as FavCat[]).forEach((c) => (out[c] = out[c]!.sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, SHORTLIST)));
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

export type PersonFavs = {
  person: Fan;
  favorites: Partial<Record<FavCat, string>>;
  top: TopFour;
  /** Their shortlist per category, best first — [0] is the favourite. */
  loves?: Partial<Record<FavCat, string[]>>;
};

/**
 * Each friend's shortlist in every category — their best-loved by acclaim and
 * taste, varied per friend: eight deep in the categories they care about, five
 * elsewhere. The first is their favourite; their Top 4 is the favourites of
 * the categories they care about most.
 */
const FRIEND_FAVS: PersonFavs[] = FRIENDS.map((f) => {
  const cares = FRIEND_CATS[f.id] || ['tacos', 'mexican', 'seafood', 'world'];
  const favorites: Partial<Record<FavCat, string>> = {};
  const loves: Partial<Record<FavCat, string[]>> = {};
  for (const c of FAV_CATS) {
    const pool = (byCat[c.id] || []).map((p) => ({ p, s: (p.acclaim || 30) * 0.5 + hash(f.id + p.id) * 60 })).sort((a, b) => b.s - a.s);
    const list = pool.slice(0, cares.includes(c.id) ? SHORTLIST : 5).map((x) => x.p.id);
    if (list.length) {
      loves[c.id] = list;
      favorites[c.id] = list[0];
    }
  }
  const top: TopFour = cares.slice(0, 4).map((c) => (favorites[c] ? { placeId: favorites[c]!, category: c } : null));
  return { person: { id: f.id, name: f.name, initials: f.initials, color: f.color, kind: 'friend' as const }, favorites, top, loves };
});

const isChefKitchen = (id: string) => !!ALL_PLACES.find((p) => p.id === id)?.chef;

/**
 * Every kitchen the guide credits to a chef is a regular haunt of at least one
 * friend: a credited venue nobody shortlisted joins the shortlist of the
 * friend it suits best (a category they care about, then taste affinity) —
 * where a shortlist has room, else in its last uncredited spot. No shortlist
 * runs past eight; favourites don't move.
 */
(() => {
  const count = new Map<string, number>();
  FRIEND_FAVS.forEach((f) => Object.values(f.loves || {}).flat().forEach((id) => count.set(id, (count.get(id) || 0) + 1)));
  for (const p of ALL_PLACES) {
    if (!p.chef || count.get(p.id)) continue;
    const c = categoryOf(p);
    const ranked = FRIEND_FAVS.map((f) => ({ f, s: ((FRIEND_CATS[f.person.id] || []).includes(c) ? 1 : 0) + hash(f.person.id + ':' + p.id) })).sort((a, b) => b.s - a.s);
    // room on a shorter shortlist first, then the last uncredited spot on a full one
    const roomy = ranked.find(({ f }) => (f.loves?.[c]?.length || 0) >= 1 && f.loves![c]!.length < SHORTLIST);
    if (roomy) {
      roomy.f.loves![c]!.push(p.id);
      count.set(p.id, 1);
      continue;
    }
    for (const { f } of ranked) {
      const list = f.loves?.[c];
      if (!list || list.length < 2) continue;
      // the lowest-ranked spot (never the favourite) held by an uncredited venue someone else also lists,
      // else any uncredited one, else one that stays on someone else's list
      let at = -1;
      for (let i = list.length - 1; i > 0 && at < 0; i--) if (!isChefKitchen(list[i]) && (count.get(list[i]) || 0) > 1) at = i;
      for (let i = list.length - 1; i > 0 && at < 0; i--) if (!isChefKitchen(list[i])) at = i;
      for (let i = list.length - 1; i > 0 && at < 0; i--) if ((count.get(list[i]) || 0) > 1) at = i; // a kitchen others list too
      if (at < 0) continue;
      count.set(list[at], (count.get(list[at]) || 1) - 1);
      list[at] = p.id;
      count.set(p.id, 1);
      break;
    }
  }
})();

/**
 * The chefs a friend follows: the ones behind a kitchen they crown, feature or
 * rank in their top three — and, so every chef has a fan, each remaining chef
 * is followed by the friend who ranks one of their kitchens highest.
 */
const FRIEND_CHEFS: Record<string, Set<string>> = (() => {
  const out: Record<string, Set<string>> = {};
  FRIEND_FAVS.forEach((f) => (out[f.person.id] = new Set()));
  const rankIn = (f: PersonFavs, id: string) => {
    for (const ids of Object.values(f.loves || {})) {
      const i = ids.indexOf(id);
      if (i >= 0) return i + 1;
    }
    return f.top.some((t) => t?.placeId === id) ? 1 : 99;
  };
  for (const chef of CHEFS) {
    let best: { f: PersonFavs; r: number } | null = null;
    for (const f of FRIEND_FAVS) {
      const r = Math.min(...chef.placeIds.map((id) => rankIn(f, id)));
      if (r <= FOLLOW_RANK) out[f.person.id].add(chef.id);
      if (r < 99 && (!best || r < best.r || (r === best.r && hash(f.person.id + chef.id) > hash(best.f.person.id + chef.id)))) best = { f, r };
    }
    if (best && !FRIEND_FAVS.some((f) => out[f.person.id].has(chef.id))) out[best.f.person.id].add(chef.id);
  }
  return out;
})();

/** The chefs a friend follows, most-loved kitchen first. */
export function chefsFollowedBy(friendId: string): Chef[] {
  const ids = FRIEND_CHEFS[friendId];
  const f = FRIEND_FAVS.find((x) => x.person.id === friendId);
  if (!ids || !f) return [];
  const lists = Object.values(f.loves || {});
  const best = (c: Chef) => Math.min(...c.placeIds.map((id) => Math.min(...lists.map((l) => (l.indexOf(id) < 0 ? 99 : l.indexOf(id))))));
  return CHEFS.filter((c) => ids.has(c.id)).sort((a, b) => best(a) - best(b));
}

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

export type Supporter = { fan: Fan; category: FavCat; rank: number }; // rank: 2 = their Nº2 there

/**
 * The people who keep this place on their shortlist without crowning it —
 * their Nº2 to Nº5 in its category. Anyone already among its fans is left out.
 * You first, then friends by how high they rank it.
 */
export function supportersOf(placeId: string, me: { fan: Fan; loves: Partial<Record<FavCat, Place[]>> } | null, fans: FanGroup[] = []): Supporter[] {
  const isFan = new Set(fans.flatMap((g) => g.fans.map((f) => f.fan.id)));
  const out: Supporter[] = [];
  const people: { fan: Fan; loves: Partial<Record<FavCat, string[]>> }[] = [];
  if (me) {
    const loves: Partial<Record<FavCat, string[]>> = {};
    (Object.entries(me.loves) as [FavCat, Place[]][]).forEach(([c, ps]) => (loves[c] = ps.map((p) => p.id)));
    people.push({ fan: me.fan, loves });
  }
  FRIEND_FAVS.forEach((f) => people.push({ fan: f.person, loves: f.loves || {} }));
  for (const p of people) {
    if (isFan.has(p.fan.id)) continue;
    for (const [c, ids] of Object.entries(p.loves) as [FavCat, string[]][]) {
      const i = ids.indexOf(placeId);
      if (i > 0) {
        out.push({ fan: p.fan, category: c, rank: i + 1 });
        break;
      }
    }
  }
  return out.sort((a, b) => (a.fan.kind === 'me' ? -1 : b.fan.kind === 'me' ? 1 : a.rank - b.rank));
}

export type ChefBacker = { fan: Fan; placeId: string; category: FavCat; rank: number; featured: boolean };

/**
 * A chef's fans and supporters, across all their kitchens. Fans crown one of
 * their kitchens, feature it in their Top 4, rank it in their top three, or
 * (friends) follow the chef; supporters keep one further down their
 * shortlist. Each person appears once, at their best rank.
 */
export function chefBackers(
  chef: Pick<Chef, 'id' | 'placeIds'>,
  me: { fan: Fan; loves: Partial<Record<FavCat, Place[]>>; top: TopFour } | null,
): { fans: ChefBacker[]; supporters: ChefBacker[] } {
  const people: { fan: Fan; loves: Partial<Record<FavCat, string[]>>; top: TopFour; follows: boolean }[] = [];
  if (me) {
    const loves: Partial<Record<FavCat, string[]>> = {};
    (Object.entries(me.loves) as [FavCat, Place[]][]).forEach(([c, ps]) => (loves[c] = ps.map((p) => p.id)));
    people.push({ fan: me.fan, loves, top: me.top, follows: false });
  }
  FRIEND_FAVS.forEach((f) => people.push({ fan: f.person, loves: f.loves || {}, top: f.top, follows: !!FRIEND_CHEFS[f.person.id]?.has(chef.id) }));
  const fans: ChefBacker[] = [];
  const supporters: ChefBacker[] = [];
  for (const p of people) {
    let best: ChefBacker | null = null;
    for (const id of chef.placeIds) {
      const slot = p.top.findIndex((t) => t?.placeId === id);
      for (const [c, ids] of Object.entries(p.loves) as [FavCat, string[]][]) {
        const i = ids.indexOf(id);
        if (i >= 0 && (!best || i + 1 < best.rank)) best = { fan: p.fan, placeId: id, category: c, rank: i + 1, featured: slot >= 0 };
      }
      if (slot >= 0 && (!best || !best.featured)) best = { fan: p.fan, placeId: id, category: p.top[slot]!.category, rank: best ? Math.min(best.rank, 1) : 1, featured: true };
    }
    if (!best) continue;
    (best.featured || best.rank <= FOLLOW_RANK || p.follows ? fans : supporters).push(best);
  }
  const order = (b: ChefBacker) => (b.fan.kind === 'me' ? -1 : b.featured ? 0 : b.rank);
  return { fans: fans.sort((a, b) => order(a) - order(b)), supporters: supporters.sort((a, b) => order(a) - order(b)) };
}

/** Resolve a place id from the guide or the seed data. */
export const favPlace = (id: string): Place | undefined => ALL_PLACES.find((p) => p.id === id) || seedById[id];

/**
 * Another tester's favourites + Top 4, from the shared backend (null without
 * the table, or if they've published nothing). Their Top 4 is the rows they
 * marked featured, in the order they were saved.
 */
export async function fetchPersonFavs(handle: string): Promise<PersonFavs | null> {
  if (!sharedEnabled()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/favorites?handle=eq.${encodeURIComponent(handle)}&select=*&order=id.asc&limit=40`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as FavRow[];
    if (!Array.isArray(rows) || !rows.length) return null;
    const r0 = rows[0];
    const favorites: Partial<Record<FavCat, string>> = {};
    const loves: Partial<Record<FavCat, string[]>> = {};
    const top: TopFour = emptyTopFour();
    let n = 0;
    for (const r of rows) {
      if (!favorites[r.category]) favorites[r.category] = r.place_id;
      const l = (loves[r.category] = loves[r.category] || []);
      if (!l.includes(r.place_id)) l.push(r.place_id);
      if (r.featured && n < 4 && !top.some((t) => t?.placeId === r.place_id)) top[n++] = { placeId: r.place_id, category: r.category };
    }
    return {
      person: { id: 'h:' + handle, name: r0.name, initials: r0.initials || r0.name.slice(0, 2).toUpperCase(), color: r0.color || 'var(--ink-400)', avatarUrl: r0.avatar_url, kind: 'community' },
      favorites,
      top,
      loves,
    };
  } catch {
    return null;
  }
}
