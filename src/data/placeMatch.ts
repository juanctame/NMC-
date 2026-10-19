/**
 * Which real place is "Taquería Los Cocuyos" from someone's Beli list? Fuzzy
 * name matching (accents, "Taquería"/"Restaurante" prefixes, OCR slips) plus
 * location when the source gives one (Google exports, Maps links) and the
 * colonia when it names one. Candidates are everything CRTQ knows: the guide,
 * the sample places, what's loaded nearby, and every discovered spot.
 *
 *   sure    — import as that place
 *   likely  — pre-selected, shown with alternatives to swap
 *   none    — not in CRTQ yet: becomes a new place from your list (or is
 *             skipped, for sources like Timeline where only known spots count)
 */
import type { Place } from '../store/data';
import type { ImportEntry, ImportSource } from './importers';
import { PHOTO_POOL } from '../assets';

export type MatchConfidence = 'sure' | 'likely' | 'none';
export type MatchResult = { entry: ImportEntry; place?: Place; confidence: MatchConfidence; sim: number; alts: Place[] };

const fold = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const GENERIC = new Set(
  'la el los las de del y the and of restaurante restaurant resto taqueria tacos taco cafe cafeteria coffee bar cocina comedor fonda panaderia bakery cantina pizzeria marisqueria mariscos mezcaleria bistro bistrot casa sucursal mx cdmx mexico city ciudad'.split(' '),
);

export function coreTokens(name: string): string[] {
  const all = fold(name).split(' ').filter(Boolean);
  const core = all.filter((t) => !GENERIC.has(t));
  return core.length ? core : all;
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const b = s.slice(i, i + 2);
    m.set(b, (m.get(b) || 0) + 1);
  }
  return m;
}

/** Dice similarity of two strings' letter pairs (0..1) — forgiving of OCR slips. */
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  A.forEach((n, k) => (inter += Math.min(n, B.get(k) || 0)));
  const total = Math.max(1, a.length - 1 + b.length - 1);
  return (2 * inter) / total;
}

/** How alike two place names are (0..1). */
export function nameSim(a: string, b: string): number {
  const ta = coreTokens(a);
  const tb = coreTokens(b);
  const ja = ta.join(' ');
  const jb = tb.join(' ');
  if (ja === jb) return 1;
  const sa = new Set(ta);
  const sb = new Set(tb);
  const inter = [...sa].filter((t) => sb.has(t)).length;
  const jac = inter / new Set([...sa, ...sb]).size;
  // one name inside the other ("Rosetta" ⊂ "Rosetta Roma"), on a distinctive word
  const [small, big] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  const contained = [...small].every((t) => big.has(t)) && [...small].some((t) => t.length >= 4);
  return Math.max(jac, contained ? 0.86 : 0, 0.95 * dice(ja, jb));
}

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLa = ((b.lat - a.lat) * Math.PI) / 180;
  const dLo = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const PRIORITY: Record<string, number> = { carte: 3, seed: 2, google: 1, osm: 0 };
const prio = (p: Place) => (p.id.startsWith('cx-') ? 3 : PRIORITY[p.source || 'seed'] ?? 0);

/** An index over candidate places by distinctive word, so a long list matches fast. */
export function indexPlaces(places: Place[]): { places: Place[]; byToken: Map<string, Place[]> } {
  const seen = new Set<string>();
  const uniq = places.filter((p) => p && p.name && !seen.has(p.id) && (seen.add(p.id), true));
  const byToken = new Map<string, Place[]>();
  for (const p of uniq) for (const t of coreTokens(p.name)) (byToken.get(t) || byToken.set(t, []).get(t)!).push(p);
  return { places: uniq, byToken };
}

/** Best place for one entry, with alternatives (pure; unit-tested). */
export function matchOne(e: ImportEntry, idx: ReturnType<typeof indexPlaces>): MatchResult {
  const toks = coreTokens(e.name);
  let pool = [...new Set(toks.flatMap((t) => idx.byToken.get(t) || []))];
  // an OCR slip can miss every word: fall back to letter-pair similarity over everything
  if (!pool.length) pool = idx.places;
  const here = e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null;
  const hood = e.hood ? fold(e.hood) : '';
  const full = fold(e.name);
  const scored = pool
    .map((p) => {
      let s = nameSim(e.name, p.name);
      if (s < 0.5) return { p, s };
      if (fold(p.name) === full) s += 0.06; // "Panadería Rosetta" ≠ "Rosetta"
      if (here && p.lat != null && p.lon != null) {
        const d = km(here, { lat: p.lat, lon: p.lon });
        s += d < 0.15 ? 0.15 : d < 0.5 ? 0.08 : d > 3 ? -0.35 : d > 1.5 ? -0.15 : 0;
      }
      if (hood && p.hood) {
        const ph = fold(p.hood);
        if (ph && (ph.includes(hood.split(' ')[0]) || hood.includes(ph.split(' ')[0]))) s += 0.05;
      }
      return { p, s: s + prio(p) * 0.013 };
    })
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s);
  // The same restaurant often appears more than once (the guide, the samples, the
  // map): same name within 400 m is one place — keep the richest record.
  for (let i = 0; i < scored.length; i++) {
    const a = scored[i];
    for (let j = scored.length - 1; j > i; j--) {
      const b = scored[j];
      const near = a.p.lat == null || b.p.lat == null || km({ lat: a.p.lat, lon: a.p.lon! }, { lat: b.p.lat, lon: b.p.lon! }) < 0.4;
      if (near && coreTokens(a.p.name).join(' ') === coreTokens(b.p.name).join(' ')) scored.splice(j, 1);
    }
  }
  const best = scored[0];
  const alts = scored.slice(1, 4).map((x) => x.p);
  if (!best) return { entry: e, confidence: 'none', sim: 0, alts: [] };
  // two strong candidates with the same name and no location to tell them apart → ask
  const tie = scored[1] && scored[1].s > best.s - 0.02 && !here;
  const confidence: MatchConfidence = best.s >= 0.92 && !tie ? 'sure' : best.s >= 0.72 ? 'likely' : 'none';
  return confidence === 'none' ? { entry: e, confidence, sim: best.s, alts: scored.slice(0, 3).map((x) => x.p) } : { entry: e, place: best.p, confidence, sim: best.s, alts };
}

export function matchAll(entries: ImportEntry[], places: Place[]): MatchResult[] {
  const idx = indexPlaces(places);
  return entries.map((e) => matchOne(e, idx));
}

const slug = (s: string) => fold(s).replace(/ /g, '-').slice(0, 40);
function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export const SOURCE_LABEL: Record<ImportSource, string> = { beli: 'Beli', google: 'Google Maps', notes: 'notes', photos: 'photos', file: 'imported' };

/** A place CRTQ doesn't know yet, from what your list says about it. */
export function placeFromEntry(e: ImportEntry, source: ImportSource): Place {
  const key = slug(e.name) + (e.lat != null ? '-' + Math.round(e.lat * 1e3) + Math.round(e.lon! * 1e3) : '');
  return {
    id: 'imp-' + key,
    name: e.name,
    cuisine: e.note && e.note.length <= 24 && !/\s{2}|[.!?]/.test(e.note) ? e.note : '',
    hood: e.hood || '',
    price: '',
    photo: PHOTO_POOL[hash(key) % PHOTO_POOL.length],
    addr: e.address || '',
    blurb: `From your ${SOURCE_LABEL[source]} list${e.note ? ` — “${e.note}”` : ''}.`,
    openInfo: '',
    ...(e.lat != null ? { lat: e.lat, lon: e.lon } : {}),
    rated: false,
    importedFrom: source,
  };
}
