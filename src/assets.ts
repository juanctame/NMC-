/**
 * Static asset registry. Metro resolves images through static `require`, so the
 * dynamic `'assets/photos/' + key + '.jpg'` paths from the prototype become key
 * lookups here. Photography ships as design-system stand-ins — replace with
 * licensed CDMX venue photography (and real short-form video for the reel)
 * before public release.
 */
export const PHOTOS: Record<string, number> = {
  'beijing-stall': require('../assets/photos/beijing-stall.jpg'),
  'bodega-man': require('../assets/photos/bodega-man.jpg'),
  'brioche-toast': require('../assets/photos/brioche-toast.jpg'),
  'butcher-sandwich': require('../assets/photos/butcher-sandwich.jpg'),
  'chef-plating': require('../assets/photos/chef-plating.jpg'),
  'elder-at-bar': require('../assets/photos/elder-at-bar.jpg'),
  'french-dip': require('../assets/photos/french-dip.jpg'),
  'hot-honey': require('../assets/photos/hot-honey.jpg'),
  'italian-deli': require('../assets/photos/italian-deli.jpg'),
  mercado: require('../assets/photos/mercado.jpg'),
  'portrait-couple': require('../assets/photos/portrait-couple.jpg'),
  'storefront-green': require('../assets/photos/storefront-green.jpg'),
};

export const BRAND = {
  logo: require('../assets/brand/logo-sticker.png') as number,
};

/** Ordered pool used by the photo-upload + place-gallery seeding logic. */
export const PHOTO_POOL = [
  'french-dip',
  'hot-honey',
  'italian-deli',
  'brioche-toast',
  'beijing-stall',
  'chef-plating',
  'butcher-sandwich',
  'storefront-green',
] as const;

export function photo(key: string): number {
  return PHOTOS[key] ?? PHOTOS['french-dip'];
}

/**
 * Source for a place image: a live Google Places photo URL when present
 * (fetched at display time, never re-hosted), otherwise a bundled sample photo.
 */
export function placePhoto(p: { photo: string; photoUrl?: string }): number | { uri: string } {
  return p.photoUrl ? { uri: p.photoUrl } : photo(p.photo);
}
