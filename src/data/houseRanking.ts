/**
 * A house critic's ranking, serialized by category (#1, #2, …): what they
 * prefer, weighed with how the place ranks overall.
 *
 *  - Preference — theirs alone. Their own score when they've given one (Beli),
 *    else read from their choices: they wrote about it, how strongly ("un
 *    referente", "imprescindible", "una joya"…), how much they had to say,
 *    and whether they pinned it on their map by hand.
 *  - Overall — everyone else: the guide's acclaim (awards, Michelin, 50 Best),
 *    the critics' consensus on CRTQ, and an established presence.
 *  - House score = 60% preference + 40% overall, on 0–10.
 *
 * Their own scores are theirs; everything else is CRTQ's estimate of their
 * list, labelled as such wherever it shows — like the critics' SIM readings.
 */
import type { Place } from '../store/data';
import { consensusFor, type Verdict } from './critics';
import { mapTitle, placeOf, type HouseCritic, type HouseEntry } from './houseCritics';

export type HouseCategory = 'specialty' | 'roasters' | 'bakery' | 'barrio';
export const HOUSE_CATEGORIES: { id: HouseCategory; label: string; blurb: string }[] = [
  { id: 'specialty', label: 'Specialty bars', blurb: 'Espresso and filter, brewed with intent' },
  { id: 'roasters', label: 'Roasters', blurb: 'They roast their own' },
  { id: 'bakery', label: 'Bakery & brunch', blurb: 'Coffee with pan, pastry or breakfast' },
  { id: 'barrio', label: 'Neighbourhood cafés', blurb: 'The everyday cup' },
];

export type HouseTake = {
  entry: HouseEntry;
  place?: Place;
  category: HouseCategory;
  pref: number; // their preference, 0–10
  overall: number; // overall standing, 0–10
  score: number; // house score
  own: boolean; // preference is their own score (not read from their choices)
  verdict: Verdict;
  quote: string; // their words (first sentences), or what the place is on their list for
  why: string[]; // what moved it up
};

const fold = (s?: string) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const CATS: [HouseCategory, RegExp][] = [
  ['roasters', /tostador|roaster|tueste|torrefac|micro-?lote|tostamos|tostado en casa|tostaduria/],
  ['bakery', /panader|bakery|pan dulce|croissant|reposter|pasteler|bolleria|masa madre|\bpan\b|brunch|desayun|breakfast|chilaquil|hotcake/],
  ['specialty', /especialidad|espresso|barra|pour ?over|v60|chemex|filtrad|barista|metodos|coffee bar|specialty/],
];
export const categoryOf = (e: HouseEntry): HouseCategory => {
  const t = fold(`${e.name} ${e.note || ''}`);
  return CATS.find(([, re]) => re.test(t))?.[0] || 'barrio';
};

// The words that mark a place they hold up (Spanish and English).
const STRONG = /referente|imprescindible|favorit|el mejor|la mejor|los mejores|excepcional|obligad|unico|joya|esencial|icono|iconic|pionero|clasico|de culto|perfect|impecable|sublime|memorable|indispensable|must/g;

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** First sentence or two of their note, for a card. */
function quoteOf(note?: string): string {
  const t = String(note || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const s = t.match(/[^.!?]+[.!?]+/g) || [t];
  let out = '';
  for (const x of s) {
    if ((out + x).length > 190 && out) break;
    out += x;
  }
  return out.trim().length > 200 ? out.trim().slice(0, 197).replace(/\s+\S*$/, '') + '…' : out.trim();
}

export function houseTake(c: HouseCritic, e: HouseEntry): HouseTake {
  const place = placeOf(e, c);
  const why: string[] = [];
  // their preference
  let pref: number;
  const own = e.score != null;
  if (own) {
    pref = e.score!;
    why.push(`his ${c.source} score`);
  } else {
    pref = 7;
    const n = fold(e.note);
    if (n.replace(/[.\s]/g, '')) {
      pref += 1.1;
      why.push('he wrote about it');
      const strong = new Set(n.match(STRONG) || []).size;
      if (strong) (pref += Math.min(2, strong) * 0.45), why.push(strong > 1 ? 'in his strongest words' : 'in strong words');
      if (n.length > 450) pref += 0.25;
    }
    if (e.precision === 'pin') (pref += 0.3), why.push('pinned by hand');
  }
  // overall standing
  let overall = 7;
  const acclaim = place?.acclaim || 0;
  if (acclaim) (overall += (acclaim / 100) * 2.2), why.push('guide acclaim');
  const cons = place ? consensusFor(place.id) : null;
  if (cons) (overall += (cons.score - 7.5) * 0.6 + Math.min(3, cons.n) * 0.15), why.push(`${cons.n} ${cons.n === 1 ? 'critic' : 'critics'} on CRTQ`);
  if (e.instagram || place?.instagram) overall += 0.2;
  pref = clamp(pref, 0, 10);
  overall = clamp(overall, 0, 10);
  const score = round1(clamp(pref * 0.6 + overall * 0.4, 0, 9.9));
  const verdict: Verdict = score >= 8.6 ? 'rave' : score >= 7.9 ? 'recommends' : 'features';
  const quote = quoteOf(e.note) || (e.list === 'map' && c.maps?.[0] ? `Nominated on his map — ${mapTitle(c)}` : '');
  return { entry: e, place, category: categoryOf(e), pref: round1(pref), overall: round1(overall), score, own, verdict, quote, why };
}

const isCdmx = (e: HouseEntry) => /ciudad de m[eé]xico/i.test(e.city || '') || /^cx-/.test(e.placeId || '');

let memo: { c: HouseCritic; all: HouseTake[] } | null = null;
/** Every place on their lists, best first (their preference breaks ties). */
export function houseRanking(c: HouseCritic): HouseTake[] {
  if (memo?.c === c) return memo.all;
  const seen = new Set<string>();
  const all = c.list
    .filter((e) => e.list !== 'want')
    .filter((e) => {
      const k = e.placeId || e.id || e.name;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .map((e) => houseTake(c, e))
    .sort((a, b) => b.score - a.score || b.pref - a.pref || b.overall - a.overall || a.entry.name.localeCompare(b.entry.name, 'es'));
  memo = { c, all };
  return all;
}

/** Their ranking for one category (or overall), in one scope, numbered from #1. */
export function rankedIn(c: HouseCritic, category: HouseCategory | 'all', scope: 'cdmx' | 'mx'): HouseTake[] {
  return houseRanking(c).filter((t) => (category === 'all' || t.category === category) && (scope === 'mx' || isCdmx(t.entry)));
}

/** Their take on one place (for its page and the critics' consensus). */
export function houseTakeFor(c: HouseCritic, placeId: string): { take: HouseTake; rank: number; of: number } | null {
  const all = houseRanking(c);
  const t = all.find((x) => x.place?.id === placeId || x.entry.placeId === placeId || x.entry.id === placeId);
  if (!t) return null;
  const inCat = all.filter((x) => x.category === t.category && isCdmx(x.entry) === isCdmx(t.entry));
  return { take: t, rank: inCat.indexOf(t) + 1, of: inCat.length };
}

export const houseAvg = (c: HouseCritic) => {
  const all = houseRanking(c);
  return all.length ? round1(all.reduce((n, t) => n + t.score, 0) / all.length) : 0;
};
