/**
 * "What to order" + "Bang for your buck" — the decision layer on a place profile.
 *
 * Google Places gives no menu, so combos are **estimates**, not scraped menus:
 * a per-cuisine "kit" of typical items, priced off the venue's price tier and
 * the city's currency, and — when the community has named a favourite dish —
 * anchored on that real signal. Every price is shown with "≈" and a disclaimer.
 *
 * The value comparison, by contrast, is built entirely from real data: the
 * Google rating + price tier of other same-cuisine, similar-priced venues that
 * are already loaded, ranked by quality-per-dollar so you can see what's a
 * genuine deal in its class.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import { qualityScore } from './recommend';

/* ---------- money ---------- */

type Cur = { symbol: string; code: string; base: number[]; round: number };
// base[priceLevel] = the cost of one "1-unit" item (a taco, a small plate) at
// that tier, in the city's currency. Deliberately rough — these are estimates.
const CUR: Record<string, Cur> = {
  MXN: { symbol: '$', code: 'MXN', base: [35, 38, 80, 165, 280], round: 5 },
  USD: { symbol: '$', code: 'USD', base: [5, 6, 13, 24, 42], round: 1 },
  JPY: { symbol: '¥', code: 'JPY', base: [380, 420, 920, 1850, 3300], round: 50 },
};

function currencyFor(city?: City): Cur {
  const c = (city?.country || '').toLowerCase();
  if (c.includes('japan')) return CUR.JPY;
  if (c.includes('usa') || c.includes('united states')) return CUR.USD;
  return CUR.MXN;
}

/** Price tier 1–4 from the venue's `$`…`$$$$`. */
export function priceLevel(place: Place): number {
  const n = ((place.price || '$').match(/\$/g) || []).length;
  return Math.max(1, Math.min(4, n || 1));
}

function fmtMoney(units: number, cur: Cur, lvl: number): { est: number; text: string } {
  const raw = units * cur.base[lvl];
  const est = Math.max(cur.round, Math.round(raw / cur.round) * cur.round);
  return { est, text: `${cur.symbol}${est.toLocaleString()}` };
}

/* ---------- combos ---------- */

type Kit = { star: string; side: string; drink: string; sweet: string };
const GENERIC: Kit = { star: 'the house special', side: 'a starter to share', drink: 'a drink', sweet: 'dessert' };
const KIT: Record<string, Kit> = {
  Mexican: { star: 'al pastor tacos', side: 'guac & chips', drink: 'agua fresca', sweet: 'flan' },
  Seafood: { star: 'tuna tostadas', side: 'ceviche', drink: 'michelada', sweet: 'tres leches' },
  Italian: { star: 'handmade pasta', side: 'burrata', drink: 'glass of red', sweet: 'tiramisù' },
  Pizza: { star: 'margherita pizza', side: 'garlic knots', drink: 'craft soda', sweet: 'cannoli' },
  Japanese: { star: "chef's nigiri set", side: 'edamame', drink: 'cold sake', sweet: 'mochi' },
  Chinese: { star: 'soup dumplings', side: 'hot & sour soup', drink: 'jasmine tea', sweet: 'sesame balls' },
  Thai: { star: 'pad see ew', side: 'spring rolls', drink: 'thai iced tea', sweet: 'mango sticky rice' },
  Indian: { star: 'butter chicken', side: 'garlic naan', drink: 'mango lassi', sweet: 'gulab jamun' },
  Korean: { star: 'bulgogi', side: 'kimchi & banchan', drink: 'soju', sweet: 'hotteok' },
  Mediterranean: { star: 'mixed grill', side: 'hummus & pita', drink: 'ayran', sweet: 'baklava' },
  French: { star: 'steak frites', side: 'french onion soup', drink: 'glass of bordeaux', sweet: 'crème brûlée' },
  Spanish: { star: 'paella', side: 'jamón & bread', drink: 'glass of rioja', sweet: 'churros' },
  American: { star: 'smash burger', side: 'loaded fries', drink: 'milkshake', sweet: 'apple pie' },
  Burgers: { star: 'double cheeseburger', side: 'fries', drink: 'shake', sweet: 'soft serve' },
  Steakhouse: { star: 'ribeye', side: 'creamed spinach', drink: 'cabernet', sweet: 'cheesecake' },
  BBQ: { star: 'brisket plate', side: 'mac & cheese', drink: 'draft beer', sweet: 'banana pudding' },
  Vegetarian: { star: 'grain bowl', side: 'roasted veg', drink: 'kombucha', sweet: 'vegan brownie' },
  Bakery: { star: 'fresh pastry', side: 'quiche slice', drink: 'cortado', sweet: 'a cookie' },
  Café: { star: 'brunch plate', side: 'avocado toast', drink: 'flat white', sweet: 'carrot cake' },
  Brunch: { star: 'eggs benedict', side: 'hash browns', drink: 'mimosa', sweet: 'french toast' },
  Bar: { star: 'snack board', side: 'wings', drink: 'house cocktail', sweet: 'churros' },
  'Street Food': { star: 'the signature plate', side: 'side of the day', drink: 'a cold drink', sweet: 'something sweet' },
  Desserts: { star: 'the signature dessert', side: 'a pastry', drink: 'espresso', sweet: 'a scoop of gelato' },
  'Fine Dining': { star: 'the tasting menu', side: 'amuse-bouche', drink: 'wine pairing', sweet: 'petit fours' },
  Contemporary: { star: "the chef's plate", side: 'a small plate', drink: 'natural wine', sweet: 'dessert of the day' },
};

export type ComboItem = { label: string; units: number };
export type Combo = {
  key: string;
  title: string;
  blurb: string;
  forText: string; // "solo" | "for two"
  items: ComboItem[];
  est: number;
  priceText: string;
  best?: boolean; // the recommended / optimal plan
};

/**
 * Three ordered plans for a venue (quick / the move / the spread). The middle
 * one is the "optimal plan" — a balanced start→main→finish — anchored on the
 * community's table favourite when there is one.
 */
export function combosFor(place: Place, topDish: string | undefined, city?: City): Combo[] {
  const kit = KIT[place.cuisine] || GENERIC;
  const cur = currencyFor(city);
  const lvl = priceLevel(place);
  // Cheap small-plate spots scale up quantities; pricier ones stay at one.
  const q = lvl <= 1 ? { light: 2, move: 3, spread: 5 } : lvl === 2 ? { light: 1, move: 2, spread: 3 } : { light: 1, move: 1, spread: 2 };
  const starName = (n: number) => (n > 1 ? `${n}× ${kit.star}` : kit.star);
  const hero = topDish || kit.star;
  const money = (u: number) => fmtMoney(u, cur, lvl);

  const quick: ComboItem[] = [
    { label: starName(q.light), units: q.light },
    { label: kit.drink, units: 0.5 },
  ];
  const move: ComboItem[] = [
    { label: kit.side, units: 0.8 },
    { label: topDish ? `${hero} — the table favourite` : starName(q.move), units: q.move },
    { label: kit.drink, units: 0.5 },
    { label: kit.sweet, units: 0.7 },
  ];
  const spread: ComboItem[] = [
    { label: kit.side, units: 0.9 },
    { label: starName(q.spread), units: q.spread },
    { label: `2× ${kit.drink}`, units: 1.0 },
    { label: kit.sweet, units: 0.7 },
  ];

  const sum = (its: ComboItem[]) => its.reduce((a, b) => a + b.units, 0);
  const mk = (key: string, title: string, blurb: string, forText: string, items: ComboItem[], best?: boolean): Combo => {
    const m = money(sum(items));
    return { key, title, blurb, forText, items, est: m.est, priceText: `≈ ${m.text}`, best };
  };

  return [
    mk('quick', 'The quick hit', 'In and out — hits the spot', 'solo', quick),
    mk('move', 'The move', topDish ? 'The balanced order, built around the crowd favourite' : 'A balanced start-to-finish order', 'solo', move, true),
    mk('spread', 'The spread', 'The full table, made to share', 'for 2', spread),
  ];
}

/** Per-combo currency code, for a small "estimated in MXN" footnote. */
export function currencyCode(city?: City): string {
  return currencyFor(city).code;
}

/* ---------- bang for your buck ---------- */

const TIER_W = [1, 1, 1.9, 3.2, 5]; // relative spend weight by price level

/** Quality-per-dollar: a 0–5 quality signal divided by the price tier. */
export function valueScore(p: Place): number {
  return qualityScore(p) / TIER_W[priceLevel(p)];
}

export type ValueRow = { place: Place; value: number; isThis: boolean };
export type PeerComp = {
  rows: ValueRow[]; // same niche + near price, ranked by value (incl. this place)
  rankOfThis: number; // 1-based
  total: number;
  verdict: string;
  cheaperBetter?: Place; // a peer that's both cheaper and at least as loved
};

/**
 * Rank this venue against same-cuisine, similar-priced neighbours by value.
 * Returns null when there aren't enough comparable venues loaded to be useful.
 */
export function peerComparison(place: Place, pool: Place[]): PeerComp | null {
  const lvl = priceLevel(place);
  const peers = pool.filter(
    (p) =>
      p.id !== place.id &&
      p.cuisine === place.cuisine &&
      p.cuisine !== 'Restaurant' &&
      (typeof p.rating === 'number' || typeof p.acclaim === 'number') &&
      Math.abs(priceLevel(p) - lvl) <= 1,
  );
  if (peers.length < 2) return null;

  const rows: ValueRow[] = [place, ...peers]
    .map((p) => ({ place: p, value: valueScore(p), isThis: p.id === place.id }))
    .sort((a, b) => b.value - a.value);
  const rankOfThis = rows.findIndex((r) => r.isThis) + 1;
  const total = rows.length;
  const pct = rankOfThis / total;
  const verdict = pct <= 0.34 ? 'Great bang for your buck' : pct <= 0.67 ? 'Fair value for its class' : 'You pay for the name here';

  // A neighbour that's cheaper *and* rated at least as high (a genuine steal).
  const thisQ = qualityScore(place);
  const cheaperBetter = peers
    .filter((p) => priceLevel(p) < lvl && qualityScore(p) >= thisQ - 0.05)
    .sort((a, b) => qualityScore(b) - qualityScore(a))[0];

  return { rows, rankOfThis, total, verdict, cheaperBetter };
}
