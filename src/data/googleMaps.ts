/**
 * Loads the Google Maps JavaScript API exactly once, with the maps, marker, and
 * places libraries. Shared by the web map surface (MapSurface.web) and the
 * Google Places provider (placesGoogle.web) so the script is fetched a single
 * time. Web-only — the key is the referrer-restricted browser key in config.ts.
 */
import { GOOGLE_MAPS_API_KEY } from '../config';

let mapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Maps is web-only'));
  }
  const w = window as any;
  if (w.google?.maps?.marker && w.google?.maps?.places) return Promise.resolve(w.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const cb = '__nmcGmapsReady';
    w[cb] = () => resolve(w.google.maps);
    const s = document.createElement('script');
    s.async = true;
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}` +
      `&libraries=maps,marker,places&v=weekly&loading=async&callback=${cb}`;
    s.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(s);
  });
  return mapsPromise;
}
