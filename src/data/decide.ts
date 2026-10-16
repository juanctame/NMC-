/**
 * "Can't decide?" — a swipe deck of restaurants dealt for you, best taste match
 * first (the same quality × palate blend as "Ideal for you", recommend.ts).
 * Swipe right: that's today's table. Left: not today. "Maybe": saved to your
 * want-to-try for later. Each day starts a fresh deck; what you swiped today is
 * remembered on the device so the deck doesn't repeat itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../store/data';
import { recommend, type ReasonTag } from './recommend';
import type { Palate } from './palate';
import { takesForPlace, type Take, type Critic } from './critics';

export type DecideAction = 'go' | 'skip' | 'later';

export type DecideState = {
  day: string; // local YYYY-MM-DD the deck belongs to
  seen: string[]; // place ids swiped today (any direction)
  pick: string | null; // today's table
  history: { id: string; action: DecideAction; addedWant: boolean }[];
};

export type DeckCard = {
  place: Place;
  /** 0–100: how well it fits you (quality × taste), as "Ideal for you" ranks it. */
  match: number;
  /** Its place in your ranking of the city (1 = your best match). */
  rank: number;
  /** 1–5 fit meter, scaled across everything you could be dealt. */
  level: number;
  reasons: ReasonTag[];
  dish?: string;
  critic?: { critic: Critic; take: Take };
};

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const freshDecide = (): DecideState => ({ day: today(), seen: [], pick: null, history: [] });

/** Today's state (a stale day resets to a fresh deck, keeping nothing). */
export const forToday = (s: DecideState): DecideState => (s.day === today() ? s : freshDecide());

const KEY = 'nmc.decide.v1';

export async function loadDecide(): Promise<DecideState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? forToday(JSON.parse(raw) as DecideState) : freshDecide();
  } catch {
    return freshDecide();
  }
}

export async function saveDecide(s: DecideState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // non-fatal: the deck still works for this session
  }
}

/**
 * Deal the deck: every nearby place you haven't ranked or swiped today, best
 * match first, nudged so two cards in a row don't share a cuisine.
 */
export function dealDeck(
  places: Place[],
  opts: { palate: Palate | null; tastes: string[]; beenIds: Set<string>; wantIds: Set<string>; seen: Set<string> },
  limit = 40,
): DeckCard[] {
  const all = recommend(places, { palate: opts.palate, tastes: opts.tastes, beenIds: opts.beenIds, wantIds: opts.wantIds });
  const recs = all.filter((r) => !opts.seen.has(r.place.id));
  const rankOf: Record<string, number> = {};
  all.forEach((r, i) => (rankOf[r.place.id] = i + 1));
  const hi = all[0]?.score ?? 1;
  const lo = all[all.length - 1]?.score ?? 0;
  const levelOf = (score: number) => (hi === lo ? 5 : 1 + Math.round((4 * (score - lo)) / (hi - lo)));
  const pool = recs.slice(0, limit * 2);
  const out: typeof pool = [];
  while (pool.length && out.length < limit) {
    const last = out[out.length - 1]?.place.cuisine;
    const i = pool.slice(0, 4).findIndex((r) => r.place.cuisine !== last);
    out.push(...pool.splice(i < 0 ? 0 : i, 1));
  }
  return out.map((r) => {
    const takes = takesForPlace(r.place.id).filter((x) => x.take.verdict === 'rave' || x.take.verdict === 'recommends' || x.take.verdict === 'acclaim');
    return {
      place: r.place,
      match: Math.max(1, Math.min(99, r.score)),
      rank: rankOf[r.place.id],
      level: levelOf(r.score),
      reasons: r.reasons,
      dish: r.place.dishes?.[0],
      critic: takes[0],
    };
  });
}
