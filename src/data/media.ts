/**
 * Restaurant media — every picture we can show for a venue, from every source,
 * merged into one ordered, credited gallery.
 *
 * Sources, best first:
 *  1. live Google Maps photos of the venue (when the Places key is enabled)
 *  2. the restaurant's own website preview image            (media.json)
 *  3. guide / press pages about the venue — Guía Michelin, Chilango, Time Out…
 *     (media.json; only pages *about this venue*, never roundups)
 *  4. a Wikipedia photo of the venue, Commons files named after it
 *  5. photos geotagged around the corner (Commons) — labelled as such
 *  6. the neighbourhood's own photo (Wikipedia)            — labelled as such
 *
 * media.json is collected in CI by scripts/collect-media.mjs (link-preview images
 * the pages publish for sharing). Nothing is re-hosted: every picture loads from
 * its source and carries a credit + link back. Press mentions (including
 * roundups) are also exposed as preview cards for the "In the press" section.
 */
import manifest from './media.json';
import type { Place } from '../store/data';
import type { LivePhoto } from './placeDetails';
import type { WikiImgResolved } from './wikiPhotos';

export type PicKind = 'google' | 'site' | 'guide' | 'wiki' | 'nearby' | 'hood';

/** One picture in a venue's gallery, always with a visible credit. */
export type Pic = {
  url: string;
  kind: PicKind;
  credit: string; // "Photo: Guía Michelin", "Wikimedia Commons · CC BY-SA 4.0"…
  label?: string; // context when it isn't the venue itself ("Around the corner")
  link?: string; // where the picture comes from
};

export type PressItem = { outlet: string; url: string; title?: string; image?: string; specific: boolean };

type VenueMedia = {
  site?: { image: string; link: string; credit: string; title?: string };
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

/** The static (build-time) pictures of the venue itself: own site + guide/press pages about it. */
export function staticPics(place: Place): Pic[] {
  const v = M.venues?.[place.id];
  const out: Pic[] = [];
  if (v?.site?.image) out.push({ url: v.site.image, kind: 'site', credit: `Photo: ${v.site.credit}`, link: v.site.link });
  for (const p of pressFor(place)) {
    if (p.specific && p.image) out.push({ url: p.image, kind: 'guide', credit: `Photo: ${p.outlet}`, link: p.url });
  }
  return out;
}

/** The best real picture we know of without any network call (for feed covers). */
export function staticCover(place: Place): Pic | undefined {
  if (place.photoUrl) return { url: place.photoUrl, kind: 'google', credit: place.photoAttr ? `Photo: ${place.photoAttr}` : 'Photo · Google Maps' };
  return staticPics(place)[0];
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
  googleUrls.forEach((url) => add({ url, kind: 'google', credit: gAttr ? `Photo: ${gAttr} · Google Maps` : 'Photo · Google Maps' }));
  staticPics(place).forEach(add);
  if (extra.venueWiki) add({ url: extra.venueWiki.url, kind: 'wiki', credit: 'Wikipedia', link: extra.venueWiki.pageUrl });
  (extra.commons || []).forEach((c) => add({ url: c.url, kind: 'wiki', credit: c.attr, link: c.pageUrl }));
  (extra.nearby || []).forEach((c) =>
    add({ url: c.url, kind: 'nearby', credit: c.attr, link: c.pageUrl, label: `Around the corner from ${place.name}` }),
  );
  if (extra.hood) add({ url: extra.hood.url, kind: 'hood', credit: extra.hood.attr, link: extra.hood.pageUrl, label: `The neighbourhood · ${place.hood}` });
  return out;
}
