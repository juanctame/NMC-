/**
 * Restaurant hashtags — the bridge from a place to the real, current short-form
 * videos people post about it. Every venue gets a stable hashtag derived from
 * its name (e.g. "El Vilsito" → #ElVilsito, "Panadería Rosetta" →
 * #PanaderiaRosetta), which we use two ways:
 *   1. to query the YouTube Data API for embeddable clips (see videosLive.web),
 *   2. to deep-link straight into each platform's live hashtag feed.
 */

// Combining diacritical marks (U+0300–U+036F), built from an escape sequence so
// no literal combining characters live in this source file.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Strip accents/diacritics to plain ASCII so tags are URL- and search-clean. */
function deaccent(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '');
}

/**
 * Derive a clean, platform-style hashtag (no leading '#') from a place name.
 * Words are capitalized and concatenated: "Tacos El Güero" → "TacosElGuero".
 */
export function hashtagOf(place: { name: string }): string {
  const tag = deaccent(place.name)
    .replace(/[&+]/g, ' ')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return tag || 'CRTQ';
}

export type TagPlatform = 'tiktok' | 'instagram' | 'youtube';

export const TAG_PLATFORMS: TagPlatform[] = ['tiktok', 'instagram', 'youtube'];

/**
 * Live hashtag-feed URLs for each platform. Instagram/YouTube tag pages are
 * lowercased and stripped of separators; TikTok tags are case-insensitive.
 * These always work — no API key needed — so the hashtag interface is useful
 * even before (or instead of) the in-app YouTube embed.
 */
export function hashtagLinks(tag: string): Record<TagPlatform, string> {
  const lower = tag.toLowerCase();
  return {
    tiktok: `https://www.tiktok.com/tag/${tag}`,
    instagram: `https://www.instagram.com/explore/tags/${lower}/`,
    youtube: `https://www.youtube.com/hashtag/${lower}`,
  };
}
