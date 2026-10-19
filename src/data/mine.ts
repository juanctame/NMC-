/**
 * Your own data on this device — ranked list, want-to-try, saved places,
 * follows and the reviews you wrote — kept per passport (by handle) so it
 * survives reloads and works offline. The cloud copy (cloud.ts) is merged in on
 * every launch; this is what the app shows instantly before that answers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '../store/data';
import type { Review } from './reviews';

export type Mine = {
  v: 1;
  ranked: Place[];
  wantIds: string[];
  saved: Record<string, boolean>;
  follows: Record<string, boolean>;
  userReviews: Review[];
  savedAt: number;
};

const key = (handle: string) => 'nmc.mine.v1.' + handle.toLowerCase();

export async function loadMine(handle: string): Promise<Mine | null> {
  try {
    const raw = await AsyncStorage.getItem(key(handle));
    const m = raw ? (JSON.parse(raw) as Mine) : null;
    return m && m.v === 1 && Array.isArray(m.ranked) ? m : null;
  } catch {
    return null;
  }
}

export async function saveMine(handle: string, m: Omit<Mine, 'v' | 'savedAt'>): Promise<void> {
  try {
    // Live photo URLs expire; keep the place, drop the ephemeral bits.
    const ranked = m.ranked.map(({ photoUrl, photoUrls, ...p }) => p as Place);
    await AsyncStorage.setItem(key(handle), JSON.stringify({ v: 1, ...m, ranked, savedAt: Date.now() }));
  } catch {
    // storage full / unavailable: the cloud copy still holds it
  }
}
