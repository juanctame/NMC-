/**
 * Types for "build your passport from photos" — the onboarding accelerator that
 * reads the location tag from the user's existing food photos and matches each
 * to the restaurant it was taken at, so new users can register where they've
 * already been in a couple of taps.
 */
import type { Place } from '../store/data';

/** A photo that carries a GPS location (read on-device; never uploaded). */
export type PhotoPoint = {
  lat: number;
  lon: number;
  time?: number; // capture time (ms), when the EXIF has it
  preview: string; // local object-URL for a thumbnail
};

/** A restaurant matched from one or more photos, awaiting the user's confirm. */
export type PhotoMatch = {
  place: Place;
  count: number; // how many of the user's photos landed here
  preview: string; // one photo thumbnail to show (the most food-like)
  distM: number; // metres from the photo to the matched venue
  picked: boolean; // included in the import
  visits?: number; // distinct days with photos here
  foodPhotos?: number; // photos the food scan says are a meal
  confidence?: 'high' | 'medium' | 'low';
  labels?: string[]; // what the food scan saw ("seafood", "a dish"…)
  alts?: Place[]; // other places that close, to correct the match
};

export type PhotoImportStatus =
  | 'idle'
  | 'picking'
  | 'matching'
  | 'scanning' // the on-device food scan
  | 'review'
  | 'done'
  | 'nogps' // photos had no location tags (common on mobile browsers)
  | 'nomatch' // had GPS but nothing matched a restaurant
  | 'unsupported' // no picker on this platform
  | 'error';
