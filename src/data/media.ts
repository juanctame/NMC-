/**
 * Restaurant media — every picture we can show for a venue, from every source,
 * grouped by who took it and merged into one ordered, credited gallery:
 *
 *  - From the restaurant (brand): every photo on its own website (media.json),
 *    and live Google Maps photos when the Places key is enabled;
 *  - From diners & creators: visitors' photos of the venue on Wikimedia Commons
 *    (media.json) and frames from third-party creators' clips about it
 *    (clips.ts — YouTube / Dailymotion stills, credited, linking to the clip);
 *  - In the press: guide / press pages about the venue (never roundups);
 *  - Around: photos geotagged around the corner and the neighbourhood's own
 *    photo — always labelled as such, never used as a cover.
 *
 * Each venue's cover is chosen to fit what it is — a fine-dining room leads with
 * its own photography, a taquería with a diner's shot of the counter — and is
 * unique across the city (no two restaurants share a cover). With no real
 * picture at all, the cover is the venue's own brand art (Cover.tsx), never a
 * stock photo of some other food.
 *
 * media.json is collected in CI by scripts/collect-media.mjs (link-preview images
 * the pages publish for sharing). Nothing is re-hosted: every picture loads from
 * its source and carries a credit + link back. Press mentions (including
 * roundups) are also exposed as preview cards for the "In the press" section.
 */
import manifest from './media.json';
import type { Place } from '../store/data';
import { byId as seedById } from '../store/data';
import { CARTE_CDMX } from './carte';
import { collectedClips } from './clips';
import type { LivePhoto } from './placeDetails';
import type { WikiImgResolved } from './wikiPhotos';

export type PicKind = 'google' | 'site' | 'guide' | 'wiki' | 'creator' | 'nearby' | 'hood';
/** Who took it: the restaurant itself, its diners / creators, the press, or the area around it. */
export type PicGroup = 'brand' | 'diners' | 'press' | 'around';

export const GROUP_LABEL: Record<PicGroup, string> = {
  brand: 'From the restaurant',
  diners: 'From diners & creators',
  press: 'In the press',
  around: 'Around it',
};

/** One picture in a venue's gallery, always with a visible credit. */
export type Pic = {
  url: string;
  kind: PicKind;
  credit: string; // "Photo: Guía Michelin", "Wikimedia Commons · CC BY-SA 4.0"…
  label?: string; // context when it isn't the venue itself ("Around the corner")
  link?: string; // where the picture comes from
  group?: PicGroup;
  /** A second URL to try if the first fails (e.g. a smaller YouTube still). */
  fallback?: string;
};

export type PressItem = { outlet: string; url: string; title?: string; image?: string; specific: boolean };

type VenueMedia = {
  site?: { image: string; images?: string[]; link: string; credit: string; title?: string };
  visitors?: { url: string; page: string; credit: string; license?: string; title?: string }[];
  press: PressItem[];
};
type Manifest = { generatedAt: string; venues: Record<string, VenueMedia> };

const M = manifest as unknown as Manifest;

/** When the CI collector last refreshed the manifest (null if never). */
export const MEDIA_UPDATED_AT: string | null = M.generatedAt && !M.generatedAt.startsWith('1970') ? M.generatedAt : null;

const OUTLET_RANK = ['Guía Michelin', 'Time Out México', 'Chilango', 'The Infatuation', 'Food and Pleasure', 'The Happening'];
const rank = (o: string) => {
  const i = OUTLET_RANK.indexOf(o);
  return i < 0 ? OUTLET_RANK.length : i;
};

/** Press & guide coverage for a venue (from the manifest, else the bare links). */
export function pressFor(place: Place): PressItem[] {
  const fromManifest = M.venues?.[place.id]?.press;
  const items: PressItem[] = fromManifest?.length
    ? fromManifest
    : (place.sources || [])
        .filter((s) => s.outlet !== 'Wikipedia')
        .map((s) => ({ outlet: s.outlet, url: s.url, specific: false }));
  return items.slice().sort((a, b) => Number(b.specific) - Number(a.specific) || rank(a.outlet) - rank(b.outlet));
}

const fold = (x: string) =>
  (x || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Seed venues borrow the media of their guide twin (same name), e.g. "pujol" → "cx-pujol". */
const TWIN: Record<string, string> = {};
{
  const byName: Record<string, string> = {};
  CARTE_CDMX.forEach((p) => (byName[fold(p.name)] = p.id));
  Object.values(seedById).forEach((p) => {
    const t = byName[fold(p.name)];
    if (t && !M.venues?.[p.id]) TWIN[p.id] = t;
  });
}
const mediaOf = (place: Place): VenueMedia | undefined => M.venues?.[place.id] || M.venues?.[TWIN[place.id]];
const clipsOf = (place: Place) => collectedClips(place.id) || (TWIN[place.id] ? collectedClips(TWIN[place.id]) : undefined) || [];

/** Logos, loaders, flags, placeholders and graphics that sites publish alongside their photos. */
const NOT_A_PHOTO =
  /logo|favicon|placeholder|sprite|icon|avatar|\.svg(\?|$)|\.gif(\?|$)|dummy|preloader|loader|no-image|\/flags?\/|\/plugins\/|rubrica|firma|signature|[-_](white|blanco|negro|black|beige)[-_.]|elements?\.|elementos|fondo|pattern|textura|badge|sello|michelin\.|cropped-|recurso[-_ %0-9]*\.png|\/fill\/w_[0-2]?\d{1,2},/i;
export const isPhotoUrl = (u: string) => !!u && !NOT_A_PHOTO.test(u);

/** The restaurant's own photos (its website), hero first. */
export function brandPics(place: Place): Pic[] {
  const site = mediaOf(place)?.site;
  if (!site) return [];
  const urls = (site.images?.length ? site.images : [site.image]).filter(isPhotoUrl);
  return urls.map((url) => ({ url, kind: 'site' as const, group: 'brand' as const, credit: `Photo: ${site.credit}`, link: site.link }));
}

/** Clips that are about the venue but not filmed there: recreations, recipes, how-tos. */
const NOT_AT_VENUE = /recreat|inspired by|inspirad|at home|en casa|receta|recipe|how to make|c[oó]mo hacer|homemade|copycat/i;

/** Diners' and creators' photos: Commons visitors + stills from creator clips about the venue. */
export function dinerPics(place: Place): Pic[] {
  const out: Pic[] = [];
  for (const v of mediaOf(place)?.visitors || []) {
    out.push({ url: v.url, kind: 'wiki', group: 'diners', credit: `Photo: ${v.credit}${v.license ? ' · ' + v.license : ''} · Wikimedia Commons`, link: v.page });
  }
  for (const c of clipsOf(place)) {
    if (c.src || (c.scope && c.scope !== 'venue')) continue; // files and related footage aren't the venue
    if (NOT_AT_VENUE.test(c.caption || '')) continue; // a recreation at home isn't a picture of the restaurant
    if (c.platform === 'youtube' && c.embedId) {
      out.push({
        url: `https://i.ytimg.com/vi/${c.embedId}/maxresdefault.jpg`,
        fallback: c.thumb || `https://i.ytimg.com/vi/${c.embedId}/hqdefault.jpg`,
        kind: 'creator',
        group: 'diners',
        credit: `Still: ${c.creator} · YouTube`,
        link: c.sourceUrl,
      });
    } else if (c.platform === 'dailymotion' && c.thumb) {
      out.push({ url: c.thumb, kind: 'creator', group: 'diners', credit: `Still: ${c.creator} · Dailymotion`, link: c.sourceUrl });
    }
    // TikTok / Instagram stills are signed URLs that expire within hours — not used as pictures.
  }
  return out;
}

/** Guide / press pictures of pages about this venue. */
export function pressPics(place: Place): Pic[] {
  return pressFor(place)
    .filter((p) => p.specific && p.image)
    .map((p) => ({ url: p.image!, kind: 'guide' as const, group: 'press' as const, credit: `Photo: ${p.outlet}`, link: p.url }));
}

/** The static (build-time) pictures of the venue itself, every source, de-duplicated. */
export function staticPics(place: Place): Pic[] {
  const out: Pic[] = [];
  [...brandPics(place), ...dinerPics(place), ...pressPics(place)].forEach((p) => {
    if (!out.some((x) => x.url === p.url)) out.push(p);
  });
  return out;
}

/** What kind of room it is — decides which picture tells its story best. */
export function styleOf(p: Place): 'street' | 'cafe' | 'room' {
  const t = fold([p.name, p.category, p.cuisine].filter(Boolean).join(' '));
  if (/panader|bakery|pasteler|cafe|cafeteria|brunch|desayun/.test(t)) return 'cafe';
  if (p.price === '$' || /taquer|tacos|taco|fonda|antojit|mercado|street|garnacha|torta|barbacoa|canasta|cantina|pulquer|marisqueria|birria|carnitas/.test(t)) return 'street';
  return 'room';
}

/**
 * Cover candidates in the order that best fits the venue: a fine-dining room by
 * its own photography (then the press, then diners); a street spot by a diner's
 * or creator's shot of the counter (then its own, then press); a café by its own
 * photos, then diners'.
 */
function coverCandidates(place: Place): Pic[] {
  // A site's PNGs are often graphics (wordmarks, collages, screenshots): any real photo goes first.
  const png = (p: Pic) => /\.png(\?|$)|~mv2\.png/i.test(p.url);
  const all = brandPics(place);
  const brand = all.filter((p) => !png(p));
  const graphics = all.filter(png);
  const diners = dinerPics(place);
  const visitors = diners.filter((d) => d.kind === 'wiki');
  const creators = diners.filter((d) => d.kind === 'creator');
  const press = pressPics(place);
  const style = styleOf(place);
  if (style === 'street') return [...visitors, ...creators, ...brand, ...press, ...graphics];
  if (style === 'cafe') return [...brand, ...visitors, ...creators, ...press, ...graphics];
  return [...brand, ...press, ...visitors, ...creators, ...graphics];
}

/** One cover per venue, unique across the city (the best-known venues choose first). */
let COVERS: Record<string, Pic> | null = null;
function covers(): Record<string, Pic> {
  if (COVERS) return COVERS;
  const out: Record<string, Pic> = {};
  const used = new Set<string>();
  const all = [...CARTE_CDMX].sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0));
  Object.values(seedById).forEach((p) => all.push(p));
  for (const p of all) {
    if (out[p.id]) continue;
    // The same restaurant listed twice (seed + guide) shares one cover.
    const twin = TWIN[p.id] && out[TWIN[p.id]];
    if (twin) {
      out[p.id] = twin;
      continue;
    }
    const pick = coverCandidates(p).find((c) => !used.has(c.url));
    if (pick) {
      out[p.id] = pick;
      used.add(pick.url);
    }
  }
  return (COVERS = out);
}

/** The best real picture we know of without any network call (for every cover). */
export function staticCover(place: Place): Pic | undefined {
  if (place.photoUrl) return { url: place.photoUrl, kind: 'google', group: 'brand', credit: place.photoAttr ? `Photo: ${place.photoAttr}` : 'Photo · Google Maps' };
  return covers()[place.id] || coverCandidates(place)[0];
}

/** Everything we have, best first, de-duplicated. */
export function galleryFor(
  place: Place,
  extra: {
    live?: LivePhoto;
    venueWiki?: WikiImgResolved;
    commons?: WikiImgResolved[];
    nearby?: WikiImgResolved[];
    hood?: WikiImgResolved | null;
  },
): Pic[] {
  const out: Pic[] = [];
  const add = (p: Pic | undefined) => {
    if (p && p.url && !out.some((x) => x.url === p.url)) out.push(p);
  };
  const googleUrls = extra.live?.photoUrls?.length
    ? extra.live.photoUrls
    : extra.live?.photoUrl
      ? [extra.live.photoUrl]
      : place.photoUrls?.length
        ? place.photoUrls
        : place.photoUrl
          ? [place.photoUrl]
          : [];
  const gAttr = extra.live?.photoAttr || place.photoAttr;
  googleUrls.forEach((url) => add({ url, kind: 'google', group: 'brand', credit: gAttr ? `Photo: ${gAttr} · Google Maps` : 'Photo · Google Maps' }));
  // The cover leads, then every picture by group: the restaurant's, diners' & creators', the press'.
  add(staticCover(place));
  staticPics(place).forEach(add);
  if (extra.venueWiki) add({ url: extra.venueWiki.url, kind: 'wiki', group: 'diners', credit: 'Wikipedia', link: extra.venueWiki.pageUrl });
  (extra.commons || []).forEach((c) => add({ url: c.url, kind: 'wiki', group: 'diners', credit: c.attr, link: c.pageUrl }));
  (extra.nearby || []).forEach((c) =>
    add({ url: c.url, kind: 'nearby', group: 'around', credit: c.attr, link: c.pageUrl, label: `Around the corner from ${place.name}` }),
  );
  if (extra.hood) add({ url: extra.hood.url, kind: 'hood', group: 'around', credit: extra.hood.attr, link: extra.hood.pageUrl, label: `The neighbourhood · ${place.hood}` });
  return out;
}
