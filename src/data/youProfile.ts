/**
 * The "You" profile, built from where you actually ate — not from posts or
 * follower counts. Three derived views:
 *
 *  - tastingMenu: your rankings plated as a tasting menu (one restaurant per
 *    course: para abrir, antojito, del mar, plato fuerte, postre, sobremesa),
 *    each with the dish you'd order there.
 *  - territory: a schematic map of CDMX colonias (from the guide's coordinates)
 *    marking the ones you've eaten in.
 *  - guideAlbum: collectable guide stamps (Michelin stars, Bib Gourmand,
 *    50 Best, 2026 openings) — which you've got, and the next to collect.
 *
 * Everything is derived from the user's own log + the curated guide dataset.
 */
import type { Place } from '../store/data';
import type { Review } from './reviews';
import { CARTE_CDMX } from './carte';
import { cuisineColor } from './palate';

const fold = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ── guide twin: the curated guide entry for a logged place ───────────────────

const CARTE_BY_NAME: Record<string, Place> = {};
CARTE_CDMX.forEach((p) => (CARTE_BY_NAME[fold(p.name)] = p));
const CARTE_NAMES = Object.keys(CARTE_BY_NAME).sort((a, b) => b.length - a.length);

/** The guide entry for a place: itself, an exact name match, or a whole-word one ("Panadería Rosetta" → Rosetta). */
export function guideTwin(p: Place, exact = false): Place | undefined {
  if (p.source === 'carte') return p;
  const n = fold(p.name);
  if (CARTE_BY_NAME[n] || exact) return CARTE_BY_NAME[n];
  const hit = CARTE_NAMES.find((c) => c.length >= 5 && (` ${n} `.includes(` ${c} `) || ` ${c} `.includes(` ${n} `)));
  return hit ? CARTE_BY_NAME[hit] : undefined;
}

// ── tasting menu ─────────────────────────────────────────────────────────────

export type Course = {
  key: string;
  es: string; // course name (Spanish, as printed on a CDMX menu)
  en: string; // gloss
  place: Place;
  dish?: string;
  score?: number;
};

const COURSES: { key: string; es: string; en: string; test: (txt: string, p: Place) => boolean }[] = [
  { key: 'abrir', es: 'Para abrir', en: 'to start the day', test: (t) => /caf|coffee|bakery|panad|brunch|desayun|breakfast|pan dulce/.test(t) },
  { key: 'antojo', es: 'Antojito', en: 'from the street', test: (t, p) => /street|taco|taquer|antoj|mercado|market|tlacoy|garnach/.test(t) || (/mexican/.test(t) && p.price === '$') },
  { key: 'mar', es: 'Del mar', en: 'from the sea', test: (t) => /seafood|marisc|fish|pescad|ceviche|ostion|oyster|sushi/.test(t) },
  { key: 'fuerte', es: 'Plato fuerte', en: 'your number one', test: () => true },
  { key: 'postre', es: 'Postre', en: 'something sweet', test: (t) => /dessert|postre|helad|ice cream|churr|chocolat|pastel|bakery|panad/.test(t) },
  { key: 'sobremesa', es: 'Sobremesa', en: 'the long goodbye', test: (t) => /\bbar\b|cantina|mezcal|cocktail|coctel|wine|vino|pulque|cervec/.test(t) },
];

const placeText = (p: Place) => fold([p.cuisine, p.category, p.name].filter(Boolean).join(' '));

/** Your rankings plated as a tasting menu — the main course is your #1; each restaurant appears once. */
export function tastingMenu(ranked: Place[], reviews: Review[] = []): Course[] {
  const pool = ranked.filter((r) => r.score != null && !r.provisional).sort((a, b) => b.score! - a.score!);
  if (!pool.length) return [];
  const used = new Set<string>();
  const picked: Record<string, Place> = {};
  // The main course first (your #1), then the specific courses, best score first.
  picked.fuerte = pool[0];
  used.add(pool[0].id);
  for (const c of COURSES) {
    if (c.key === 'fuerte') continue;
    const hit = pool.find((p) => !used.has(p.id) && c.test(placeText(p), p));
    if (hit) {
      picked[c.key] = hit;
      used.add(hit.id);
    }
  }
  const mine = (id: string) => reviews.find((r) => r.placeId === id && r.authorId === 'me' && r.dish)?.dish;
  return COURSES.filter((c) => picked[c.key]).map((c) => {
    const p = picked[c.key];
    const twin = guideTwin(p, true); // exact only: a namesake's dishes would be wrong
    return { key: c.key, es: c.es, en: c.en, place: p, score: p.score, dish: mine(p.id) || p.dishes?.[0] || twin?.dishes?.[0] };
  });
}

// ── territory (colonias) ─────────────────────────────────────────────────────

const HOOD_ALIAS: Record<string, string> = {
  'roma nte': 'roma norte',
  'hipodromo condesa': 'hipodromo',
  'coyoacan centro': 'coyoacan',
  'centro historico': 'centro',
};
export const hoodKey = (h: string) => {
  const k = fold(h);
  return HOOD_ALIAS[k] || k;
};

export type HoodTile = {
  key: string;
  name: string;
  abbr: string;
  col: number;
  row: number;
  guide: Place[]; // guide venues in this colonia
  mine: Place[]; // your ranked places here
  color: string;
};

export const GRID_COLS = 7;
export const GRID_ROWS = 6;

const STOP = new Set(['de', 'del', 'la', 'las', 'los', 'el']);
function abbrOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

// Approximate centres for guide colonias whose venues carry no coordinates
// (the schematic only needs their rough position).
const HOOD_CENTRE: Record<string, [number, number]> = {
  narvarte: [19.392, -99.152],
  'santa fe': [19.366, -99.262],
  'portales sur': [19.367, -99.142],
  'toriello guerra': [19.297, -99.17],
  transito: [19.418, -99.128],
  'alvaro obregon': [19.358, -99.203],
  'san angel': [19.346, -99.19],
  'tlacoquemecatl del valle': [19.374, -99.172],
};

type HoodBase = { key: string; name: string; lat: number; lon: number; guide: Place[] };
const HOODS: HoodBase[] = (() => {
  const by: Record<string, { names: Record<string, number>; lat: number; lon: number; n: number; guide: Place[] }> = {};
  CARTE_CDMX.forEach((p) => {
    if (!p.hood) return;
    const k = hoodKey(p.hood);
    const h = (by[k] = by[k] || { names: {}, lat: 0, lon: 0, n: 0, guide: [] });
    h.names[p.hood] = (h.names[p.hood] || 0) + 1;
    h.guide.push(p);
    if (p.lat != null && p.lon != null) {
      h.lat += p.lat;
      h.lon += p.lon;
      h.n++;
    }
  });
  Object.entries(HOOD_CENTRE).forEach(([k, [lat, lon]]) => {
    const h = by[k];
    if (h && !h.n) Object.assign(h, { lat, lon, n: 1 });
  });
  return Object.entries(by)
    .filter(([, h]) => h.n > 0)
    .map(([key, h]) => {
      const name = key === 'coyoacan' ? 'Coyoacán' : Object.entries(h.names).sort((a, b) => b[1] - a[1])[0][0];
      return { key, name, lat: h.lat / h.n, lon: h.lon / h.n, guide: h.guide.sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0)) };
    });
})();

/**
 * A schematic (metro-map-like) layout: colonias keep their real west→east and
 * north→south order, spread evenly on a grid so the dense centre stays legible.
 */
const LAYOUT: Record<string, { col: number; row: number; abbr: string }> = (() => {
  const n = HOODS.length;
  const rankOf = (arr: HoodBase[]) => {
    const r: Record<string, number> = {};
    arr.forEach((h, i) => (r[h.key] = n > 1 ? i / (n - 1) : 0.5));
    return r;
  };
  const lonRank = rankOf(HOODS.slice().sort((a, b) => a.lon - b.lon));
  const latRank = rankOf(HOODS.slice().sort((a, b) => b.lat - a.lat)); // north on top
  const taken = new Set<string>();
  const out: Record<string, { col: number; row: number; abbr: string }> = {};
  const usedAbbr: Record<string, number> = {};
  // Busiest colonias claim their spot first.
  HOODS.slice()
    .sort((a, b) => b.guide.length - a.guide.length)
    .forEach((h) => {
      const c0 = Math.round(lonRank[h.key] * (GRID_COLS - 1));
      const r0 = Math.round(latRank[h.key] * (GRID_ROWS - 1));
      let best = { col: c0, row: r0, d: Infinity };
      for (let r = 0; r < GRID_ROWS; r++)
        for (let c = 0; c < GRID_COLS; c++) {
          if (taken.has(c + ',' + r)) continue;
          const d = (c - c0) ** 2 + (r - r0) ** 2;
          if (d < best.d) best = { col: c, row: r, d };
        }
      taken.add(best.col + ',' + best.row);
      let abbr = abbrOf(h.name);
      usedAbbr[abbr] = (usedAbbr[abbr] || 0) + 1;
      if (usedAbbr[abbr] > 1) abbr = abbr.slice(0, 2) + usedAbbr[abbr];
      out[h.key] = { col: best.col, row: best.row, abbr };
    });
  return out;
})();

/** Every guide colonia on the schematic grid, with your places in each. Places in colonias the guide doesn't cover are returned separately. */
export function territory(ranked: Place[]): { tiles: HoodTile[]; elsewhere: Place[]; visited: number } {
  const mineBy: Record<string, Place[]> = {};
  const elsewhere: Place[] = [];
  ranked.forEach((p) => {
    const k = hoodKey(p.hood || guideTwin(p, true)?.hood || '');
    if (LAYOUT[k]) (mineBy[k] = mineBy[k] || []).push(p);
    else elsewhere.push(p);
  });
  const tiles = HOODS.map((h) => {
    const mine = (mineBy[h.key] || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    return { key: h.key, name: h.name, ...LAYOUT[h.key], guide: h.guide, mine, color: mine.length ? cuisineColor(mine[0].cuisine) : '' };
  });
  return { tiles, elsewhere, visited: tiles.filter((t) => t.mine.length).length };
}

// ── guide album ──────────────────────────────────────────────────────────────

export type AlbumSet = { key: string; label: string; note: string; all: Place[]; got: Place[]; next?: Place };

const SETS: { key: string; label: string; note: string; test: (p: Place) => boolean }[] = [
  { key: 'stars', label: 'Michelin stars', note: 'Guía Michelin 2026', test: (p) => /estrella/i.test(p.awards || '') },
  { key: '50best', label: '50 Best', note: "Latin America's / World's 50 Best", test: (p) => /50 best/i.test(p.awards || '') },
  { key: 'bib', label: 'Bib Gourmand', note: 'great food, fair price', test: (p) => /bib gourmand/i.test(p.awards || '') },
  { key: 'open26', label: 'Openings 2026', note: 'the year’s new tables', test: (p) => p.moment === 'Apertura 2026' },
];

/** Collectable guide stamps: which you've been to (via your log), and the most acclaimed one still to collect. */
export function guideAlbum(ranked: Place[]): AlbumSet[] {
  const been = new Set<string>();
  ranked.forEach((p) => {
    const t = guideTwin(p, true); // exact only: a namesake must not earn another venue's award
    if (t) been.add(t.id);
  });
  return SETS.map((s) => {
    const all = CARTE_CDMX.filter(s.test).sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0));
    const got = all.filter((p) => been.has(p.id));
    return { key: s.key, label: s.label, note: s.note, all, got, next: all.find((p) => !been.has(p.id)) };
  }).filter((s) => s.all.length);
}

/** Small deterministic hash (for per-user generative art). */
export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}
