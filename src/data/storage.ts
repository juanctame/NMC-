/**
 * Local persistence for the account. AsyncStorage works across Expo Go, native
 * builds, and the web export (via localStorage), so a created profile survives
 * app restarts / page reloads on every surface. Swap these three functions for
 * API calls when a real backend lands.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from './profile';

const KEY = 'nmc.profile.v1';

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(p: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // non-fatal: profile still lives in memory for this session
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
