/**
 * Always something new — choosing which discovered spots to put in front of
 * someone, each time they open the app.
 *
 * For every spot the sweep found (spots.ts), the score is:
 *   pool       what the sweep thinks of it before any taste: how new it is,
 *              whether the press is talking about it, whether a diner told us,
 *              how much we know (hours, cuisine, site, photo); chains sink
 *   + taste    does its cuisine / kind match what this person loves (the
 *              cuisines they rank and the tastes they picked)
 *   + near     closer is better, gently (when we know where they are)
 *   − fatigue  every time we showed it and they didn't open it, it sinks —
 *              hardest right after, fading over a few days
 *   + explore  a small per-person, per-day shuffle, so two people (and two
 *              days) never see the same list
 * Spots they've ranked, dismissed or already saved never come back; the guide's
 * own restaurants are left to their richer pages. The top of the list is kept
 * varied (not three cafés from one colonia in a row). When everything nearby
 * has been seen, the radius widens; when everything has been seen, the oldest
 * impressions are forgiven — so the list is never empty and never stale.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Spot } from './spots';

export type DiscoverMemory = {
  shown: Record<string, [number, number]>; // id → [times shown, last shown ms]
  opened: Record<string, number>; // id → last opened ms
  dismissed: string[];
};

const KEY = 'nmc.discover.v1';
export const emptyMemory = (): DiscoverMemory => ({ shown: {}, opened: {}, dismissed: [] });

export async function loadMemory(): Promise<DiscoverMemory> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? (JSON.parse(raw) as DiscoverMemory) : null;
    return m && m.shown ? { ...emptyMemory(), ...m } : emptyMemory();
  } catch {
    return emptyMemory();
  }
}
export async function saveMemory(m: DiscoverMemory): Promise<void> {
  try {
    // Keep it small: the 600 most recent impressions.
    const shown = Object.fromEntries(Object.entries(m.shown).sort((a, b) => b[1][1] - a[1][1]).slice(0, 600));
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...m, shown, dismissed: m.dismissed.slice(-400) }));
  } catch {
    // ignore
  }
}

export type DiscoverCtx = {
  seed: string; // the person (handle) — their own shuffle
  exclude: Set<string>; // ranked + want-to-try ids
  likes: Record<string, number>; // lower-cased cuisine/kind word → weight 0..1
  at?: { lat: number; lon: number } | null;
  memory: DiscoverMemory;
  now?: number;
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLa = ((b.lat - a.lat) * Math.PI) / 180;
  const dLo = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Taste words → the OpenStreetMap cuisine / kind words they cover. */
const SYN: Record<string, string[]> = {
  mexican: ['mexican', 'regional', 'tacos', 'taco', 'oaxacan', 'yucatecan', 'street', 'tortilleria'],
  street: ['street', 'tacos', 'taco', 'quick', 'bites', 'burger', 'hot', 'dog', 'tortilleria'],
  cafe: ['cafe', 'coffee', 'shop', 'roaster', 'tea', 'breakfast', 'brunch'],
  bakery: ['bakery', 'pastry', 'bread', 'cake', 'deli'],
  bar: ['bar', 'pub', 'beer', 'garden', 'cocktail', 'wine', 'mezcal'],
  japanese: ['japanese', 'sushi', 'ramen', 'izakaya'],
  italian: ['italian', 'pizza', 'pasta'],
  seafood: ['seafood', 'fish', 'oysters', 'ceviche'],
  desserts: ['ice', 'cream', 'dessert', 'sweets', 'pastry', 'churros', 'frozen', 'yogurt'],
  vegetarian: ['vegetarian', 'vegan', 'healthy', 'salad'],
  mediterranean: ['mediterranean', 'greek', 'lebanese', 'turkish', 'spanish', 'middle', 'eastern'],
  fine: ['fine', 'dining', 'french', 'contemporary'],
  brunch: ['breakfast', 'brunch', 'cafe'],
};

/**
 * What someone likes, as weighted words: the tastes they picked (strong) and
 * the cuisines across their ranked list (by share).
 */
export function likesFrom(tastes: string[], topCuisines: { name: string; pct: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (label: string, w: number) => {
    for (const t of fold(label).split(/[^a-z]+/).filter((x) => x.length > 2)) {
      for (const word of [t, ...(SYN[t] || [])]) out[word] = Math.max(out[word] || 0, w);
    }
  };
  tastes.forEach((t) => add(t, 1));
  topCuisines.forEach((c) => add(c.name, Math.min(1, 0.4 + c.pct / 100)));
  return out;
}

/** How much this person would like this kind of place (0..1). */
export function tasteOf(s: Spot, likes: Record<string, number>): number {
  const words = fold([...(s.c || []), s.k].join(' ')).split(/[^a-z]+/).filter((w) => w.length > 2);
  let best = 0;
  for (const w of words) best = Math.max(best, likes[w] || 0);
  return best;
}

/** One spot's score for this person right now (pure; unit-tested). */
export function scoreSpot(s: Spot, ctx: DiscoverCtx, radiusKm: number): number | null {
  if (ctx.exclude.has(s.id) || ctx.memory.dismissed.includes(s.id) || s.guide) return null;
  const now = ctx.now ?? Date.now();
  let d = 0;
  if (ctx.at) {
    d = km(ctx.at, { lat: s.la, lon: s.lo });
    if (d > radiusKm) return null;
  }
  const pool = s.ps ?? 20;
  const taste = 30 * tasteOf(s, ctx.likes);
  const near = ctx.at ? 18 * Math.exp(-d / 3) : 0;
  const seen = ctx.memory.shown[s.id];
  const opened = ctx.memory.opened[s.id];
  let fatigue = 0;
  if (seen) {
    const [n, last] = seen;
    const hours = (now - last) / 36e5;
    fatigue = Math.min(60, n * 9) * Math.exp(-hours / 72) + (hours < 20 ? 25 : 0);
  }
  if (opened && now - opened < 7 * 864e5) fatigue += 20; // you've looked; give others a turn
  const day = new Date(now).toISOString().slice(0, 10);
  const explore = 14 * hash(ctx.seed + '|' + s.id + '|' + day);
  return pool + taste + near + explore - fatigue;
}

/** Keep the top of the list varied: at most 2 per colonia and 3 per kind in the first dozen. */
export function diversify<T extends { s: Spot }>(list: T[], top = 12): T[] {
  const head: T[] = [];
  const rest: T[] = [];
  const hood: Record<string, number> = {};
  const kind: Record<string, number> = {};
  for (const x of list) {
    const h = x.s.h || '?';
    const k = x.s.c?.[0] || x.s.k;
    if (head.length < top && (hood[h] || 0) < 2 && (kind[k] || 0) < 3) {
      head.push(x);
      hood[h] = (hood[h] || 0) + 1;
      kind[k] = (kind[k] || 0) + 1;
    } else rest.push(x);
  }
  return [...head, ...rest];
}

/**
 * The spots to show now, best first — never empty while the sweep has spots:
 * widen the radius (3 → 8 → 20 km → the whole city), then forgive old
 * impressions.
 */
export function discover(spots: Spot[], ctx: DiscoverCtx, n = 12): { spots: Spot[]; radiusKm: number | null; recycled: boolean } {
  const tryWith = (c: DiscoverCtx, r: number) =>
    spots
      .map((s) => ({ s, x: scoreSpot(s, c, r) }))
      .filter((v): v is { s: Spot; x: number } => v.x != null)
      .sort((a, b) => b.x - a.x);
  const radii = ctx.at ? [3, 8, 20, Infinity] : [Infinity];
  for (const r of radii) {
    const ranked = tryWith(ctx, r);
    // "Fresh" = not shown in the last day; we want a full list of those.
    const fresh = ranked.filter((v) => !ctx.memory.shown[v.s.id] || (ctx.now ?? Date.now()) - ctx.memory.shown[v.s.id][1] > 864e5);
    if (fresh.length >= Math.min(n, 6) || r === Infinity) {
      if (fresh.length) return { spots: diversify(fresh).slice(0, n).map((v) => v.s), radiusKm: r === Infinity ? null : r, recycled: false };
      if (ranked.length) return { spots: diversify(ranked).slice(0, n).map((v) => v.s), radiusKm: r === Infinity ? null : r, recycled: true };
    }
  }
  // Seen it all (or dismissed it all): start over with a clean slate, minus what they turned down.
  const clean = { ...ctx, memory: { ...ctx.memory, shown: {}, opened: {} } };
  const ranked = tryWith(clean, Infinity);
  return { spots: diversify(ranked).slice(0, n).map((v) => v.s), radiusKm: null, recycled: true };
}

/** Record that these were shown (call once per showing). */
export function markShown(m: DiscoverMemory, ids: string[], now = Date.now()): DiscoverMemory {
  const shown = { ...m.shown };
  ids.forEach((id) => (shown[id] = [(shown[id]?.[0] || 0) + 1, now]));
  return { ...m, shown };
}
