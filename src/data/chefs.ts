/**
 * Chef profiles — derived at runtime from the curated CDMX "Carte" dataset.
 *
 * Every venue that names a chef or kitchen team gets a profile. When the SAME
 * chef (or team) stands behind more than one restaurant in the guide, those
 * restaurants link into a SINGLE profile: we group venues by a normalized key
 * (accent- and nickname-insensitive) so "Eduardo (Lalo) García" at Máximo and
 * at Havre 77, or "Lucho Martínez" across Em / Martínez / Ultramarinos Demar,
 * resolve to one person.
 *
 * Nothing here is fabricated — names, restaurants and awards all come straight
 * from the guide (`carte.ts`). We only connect the dots between venues the
 * guide already credits to the same cook.
 */
import type { Place } from '../store/data';
import { CARTE_CDMX } from './carte';

export type Chef = {
  id: string; // 'chef-<slug>'
  name: string; // display name (keeps nicknames, e.g. "Eduardo (Lalo) García")
  key: string; // normalized dedup key
  placeIds: string[]; // their restaurants in the guide
  acclaim: number; // best (max) acclaim across their venues
  topAward: string; // the most prestigious badge they hold (e.g. "Michelin ★★")
  cuisines: string[]; // distinct cuisines they cook
  hoods: string[]; // distinct neighbourhoods they're in
};

/**
 * Collapse a credited chef/team string to a comparison key: drop trailing notes
 * after a "·" separator (e.g. "· cocina de …"), parenthetical roles/nicknames
 * ("(Lalo)", "(grupo)", "(dirección)"), accents and quote marks. Two venues
 * credited to the same cook land on the same key even when one spells out a
 * nickname or a group suffix.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/\s*[·|].*$/, '') // drop "· cocina de …" trailing notes
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop parenthetical roles / nicknames
    .replace(/[«»"'‟„]/g, '') // drop quote marks around nicknames
    .replace(/\s+/g, ' ')
    .trim();
}

/** A clean variant has no group/role suffix — preferred as the display name. */
function isClean(s: string): boolean {
  return !/[·|]/.test(s) && !/grupo|direcci|menú|menu|fundador/i.test(s);
}

/** The guide badge a venue holds, e.g. "Michelin ★★", "Bib Gourmand", "50 Best". */
export function guideBadgeOf(p: Place): string {
  const a = p.awards || '';
  if (/estrella/i.test(a)) {
    const m = /(\d)\s*estrella/i.exec(a);
    return 'Michelin ' + (m ? '★'.repeat(Math.min(3, +m[1])) : '★');
  }
  if (/bib gourmand/i.test(a)) return 'Bib Gourmand';
  if (/michelin/i.test(a)) return 'Michelin';
  if (/50 best/i.test(a)) return '50 Best';
  return '';
}

function slugify(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'chef'
  );
}

// ── Build the chef index once, from the curated dataset ──────────────────────

const CARTE_BY_ID: Record<string, Place> = {};
CARTE_CDMX.forEach((p) => (CARTE_BY_ID[p.id] = p));

const chefMap: Record<string, Chef> = {};
const placeToChef: Record<string, string> = {};

{
  // Group raw credit strings by normalized key.
  const groups: Record<string, { variants: string[]; places: Place[] }> = {};
  for (const p of CARTE_CDMX) {
    const raw = (p.chef || '').trim();
    if (!raw) continue;
    const key = norm(raw);
    if (!key) continue;
    const g = (groups[key] = groups[key] || { variants: [], places: [] });
    g.variants.push(raw);
    g.places.push(p);
  }

  for (const key of Object.keys(groups)) {
    const { variants, places } = groups[key];
    // Display name: prefer a clean variant (no "grupo/dirección" suffix), and
    // among those the most descriptive (longest — keeps a "(Lalo)" nickname).
    const clean = variants.filter(isClean);
    const pool = clean.length ? clean : variants;
    const name = pool.slice().sort((a, b) => b.length - a.length)[0];

    const placeIds = places.map((p) => p.id);
    const acclaim = places.reduce((m, p) => Math.max(m, p.acclaim ?? 0), 0);
    const best = places.slice().sort((a, b) => (b.acclaim ?? 0) - (a.acclaim ?? 0))[0];
    const topAward = guideBadgeOf(best) || best.recognition || '';
    const cuisines = Array.from(new Set(places.map((p) => p.cuisine).filter(Boolean)));
    const hoods = Array.from(new Set(places.map((p) => p.hood).filter(Boolean)));

    const id = 'chef-' + slugify(name);
    const chef: Chef = { id, name, key, placeIds, acclaim, topAward, cuisines, hoods };
    chefMap[id] = chef;
    placeIds.forEach((pid) => (placeToChef[pid] = id));
  }
}

/** All chefs, most prolific & most acclaimed first. */
export const CHEFS: Chef[] = Object.values(chefMap).sort(
  (a, b) => b.placeIds.length - a.placeIds.length || b.acclaim - a.acclaim || a.name.localeCompare(b.name),
);

/** Chefs behind more than one restaurant in the guide (the linked profiles). */
export const MULTI_CHEFS: Chef[] = CHEFS.filter((c) => c.placeIds.length > 1);

/**
 * The chefs to surface on the feed: everyone behind multiple venues first, then
 * the most acclaimed single-venue chefs, so the rail always has star power.
 */
export const FEATURED_CHEFS: Chef[] = [
  ...MULTI_CHEFS,
  ...CHEFS.filter((c) => c.placeIds.length === 1 && c.acclaim >= 83),
].slice(0, 16);

export function chefById(id: string | null | undefined): Chef | undefined {
  return id ? chefMap[id] : undefined;
}

/** The chef profile a venue belongs to (by the guide's credit), if any. */
export function chefForPlace(place: Place | null | undefined): Chef | undefined {
  if (!place) return undefined;
  const direct = placeToChef[place.id];
  if (direct) return chefMap[direct];
  // A live/other-source place that still names a chef can resolve by name.
  if (place.chef) {
    const k = norm(place.chef);
    return CHEFS.find((c) => c.key === k);
  }
  return undefined;
}

/** Resolve a chef's restaurants to full Place records (guide order by acclaim). */
export function placesOfChef(chef: Chef): Place[] {
  return chef.placeIds
    .map((id) => CARTE_BY_ID[id])
    .filter((p): p is Place => !!p)
    .sort((a, b) => (b.acclaim ?? 0) - (a.acclaim ?? 0));
}

// ── The chef's dossier: everything the guide says about their kitchens ─────

export type ChefDossier = {
  places: Place[];
  /** Signature dishes from the guide's "what to order", with the kitchen they're from. */
  dishes: { dish: string; place: Place }[];
  /** Every distinction across their restaurants (Michelin, 50 Best, guides…). */
  awards: { text: string; place: Place }[];
  /** The guide's own words about each of their kitchens. */
  words: { place: Place; text: string; why?: string; tip?: string }[];
  /** Per-person spend across their restaurants (MXN), when the guide gives it. */
  spend: { lo: number; hi: number } | null;
  /** "Apertura 2026", "Trayectoria"… and what each room is ideal for. */
  moments: string[];
  occasions: string[];
  /** Surname / name forms used to recognise them in clip titles. */
  aliases: string[];
};

const foldText = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function chefDossier(chef: Chef): ChefDossier {
  const places = placesOfChef(chef);
  const dishes: ChefDossier['dishes'] = [];
  const seenDish = new Set<string>();
  // Two per kitchen first, so every restaurant is represented, then the rest.
  for (const round of [0, 1, 2]) {
    for (const p of places) {
      const d = p.dishes?.[round];
      if (d && !seenDish.has(foldText(d))) {
        seenDish.add(foldText(d));
        dishes.push({ dish: d, place: p });
      }
    }
  }
  const awards: ChefDossier['awards'] = [];
  const seenAward = new Set<string>();
  for (const p of places) {
    for (const a of (p.awards || '').split(';').map((x) => x.trim()).filter(Boolean)) {
      const k = foldText(a) + '|' + p.id;
      if (!seenAward.has(k)) {
        seenAward.add(k);
        awards.push({ text: a, place: p });
      }
    }
  }
  const words = places.filter((p) => p.blurb).map((p) => ({ place: p, text: p.blurb, why: p.why, tip: p.tip }));
  const mids = places.map((p) => p.ticketMid).filter((n): n is number => typeof n === 'number' && n > 0);
  // Full names only (a bare surname like "Martínez" is also a restaurant); teams split into people.
  const aliases = chefPeople(chef).map(foldText).filter((a) => a.split(' ').length >= 2);
  const nick = /\(([^)]+)\)/.exec(chef.name)?.[1];
  const surname = chefPeople(chef)[0]?.split(' ').slice(-1)[0];
  if (nick && surname && nick.length >= 3 && !/grupo|direcci/i.test(nick)) aliases.push(foldText(nick + ' ' + surname));
  return {
    places,
    dishes: dishes.slice(0, 12),
    awards,
    words,
    spend: mids.length ? { lo: Math.min(...mids), hi: Math.max(...mids) } : null,
    moments: [...new Set(places.map((p) => p.moment).filter((m): m is string => !!m))],
    occasions: [...new Set(places.map((p) => p.occasion).filter((m): m is string => !!m))],
    aliases: [...new Set(aliases)],
  };
}

/** The people behind a credit: "Jorge Vallejo y Alejandra Flores" → two names. */
export function chefPeople(chef: Chef): string[] {
  const clean = chef.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[·|].*$/, '').replace(/\s+/g, ' ').trim();
  return clean
    .split(/\s+y\s+|\s*&\s*|\s*,\s*|\s+and\s+/i)
    .map((x) => x.trim())
    .filter((x) => x.split(' ').length >= 2);
}

/** Does a clip title / creator name mention this chef? */
export function mentionsChef(d: ChefDossier, ...texts: (string | undefined)[]): boolean {
  const t = foldText(texts.filter(Boolean).join(' '));
  return d.aliases.some((a) => new RegExp(`(^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(t));
}
