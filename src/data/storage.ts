/**
 * Local persistence for the account. AsyncStorage works across Expo Go, native
 * builds, and the web export (via localStorage), so a created profile survives
 * app restarts / page reloads on every surface. Swap these three functions for
 * API calls when a real backend lands.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from './profile';
import type { Lang } from '../i18n';
import type { Session } from './auth';

const KEY = 'nmc.profile.v1';
const LANG_KEY = 'nmc.lang.v1';
const SESSION_KEY = 'nmc.session.v1';

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

const LANGS: Lang[] = ['en', 'es', 'fr'];

export async function loadLang(): Promise<Lang | null> {
  try {
    const raw = await AsyncStorage.getItem(LANG_KEY);
    return raw && (LANGS as string[]).includes(raw) ? (raw as Lang) : null;
  } catch {
    return null;
  }
}

export async function saveLang(lang: Lang): Promise<void> {
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {
    // non-fatal: language still applies for this session
  }
}

// ── Supabase Auth session (Google sign-in) ──────────────────────────────────

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // non-fatal
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
