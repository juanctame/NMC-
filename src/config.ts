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
