/**
 * Client configuration.
 *
 * GOOGLE_MAPS_API_KEY is a *browser* key: the Google Maps JavaScript API is
 * designed to run in the page, so this key ships in the web build and is not a
 * secret. It is only safe to expose once you lock it down in the Google Cloud
 * console:
 *   1. APIs & Services → Credentials → this key → Application restrictions →
 *      "Websites", and add your referrers:
 *        https://juanctame.github.io/*   (and http://localhost:*  for dev)
 *   2. API restrictions → allow only "Maps JavaScript API".
 * A referrer-restricted browser key can't be reused on other domains, so it is
 * fine to commit. NEVER put a server/secret key or a billing token in here.
 *
 * The native app (iOS/Android) does not use this — Google Maps in a real build
 * would go through react-native-maps with a platform key in app config.
 */
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCxWK3IkX7wxgEtyrxRuAU1k2f7jbOEo9Q';

/**
 * A vector Map ID is required for Advanced Markers. DEMO_MAP_ID works out of the
 * box; create your own in the console (Map Management) to apply a custom
 * "printed paper" style that matches the brand.
 */
export const GOOGLE_MAPS_MAP_ID = 'DEMO_MAP_ID';

/**
 * YouTube Data API key — powers the in-app "On the reel" strip: real, current
 * videos found by each restaurant's hashtag, played through YouTube's embeddable
 * player. YouTube is the one platform whose hashtag/keyword search AND embed
 * work from a browser with just an API key (no OAuth), so it's what loads clips
 * inside the app; TikTok / Instagram are reached via hashtag deep-links.
 *
 * It reuses the Maps browser key by default. To turn the in-app strip on:
 *   1. Google Cloud console → APIs & Services → Library → enable
 *      "YouTube Data API v3" on the SAME project as the Maps key.
 *   2. Credentials → this key → API restrictions → also allow
 *      "YouTube Data API v3" (keep the Websites referrer restriction).
 * Leave it as the Maps key, or paste a dedicated browser key here. Blank turns
 * the in-app strip off — the hashtag deep-links to TikTok/IG/YouTube still work.
 */
export const YOUTUBE_API_KEY = GOOGLE_MAPS_API_KEY;

/**
 * Shared demo backend (Supabase) — makes usernames + reviews visible to every
 * tester instead of only their own device. Leave both blank to keep the app
 * local-only; paste your project's values to turn sharing on (see SHARED_DEMO.md
 * for the 3-step setup). The anon key is a public, row-level-security-gated key
 * meant to live in the client, so it is safe to commit.
 */
export const SUPABASE_URL = 'https://psbxxcupbbgwcjzqkygb.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzYnh4Y3VwYmJnd2NqenFreWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjU5NjgsImV4cCI6MjEwMTk0MTk2OH0.3KWMp-rnIMKnDYsixj0bXZ_R9FQyyoGBYQZdg881eOM';
