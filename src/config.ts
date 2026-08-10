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
 * Shared demo backend (Supabase) — makes usernames + reviews visible to every
 * tester instead of only their own device. Leave both blank to keep the app
 * local-only; paste your project's values to turn sharing on (see SHARED_DEMO.md
 * for the 3-step setup). The anon key is a public, row-level-security-gated key
 * meant to live in the client, so it is safe to commit.
 */
export const SUPABASE_URL = 'https://psbxxcupbbgwcjzqkygb.supabase.co';
export const SUPABASE_ANON_KEY = ''; // paste the "anon public" key (Settings → API) to turn sharing on
