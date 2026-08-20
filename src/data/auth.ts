/**
 * Supabase Auth — "Continue with Google". Creates real users from their Google /
 * Gmail identity and stores them centrally in Supabase (auth.users), which the
 * app then links to a public profile (see accounts.ts). Uses the OAuth implicit
 * flow so it works from a static, no-SDK web build: we redirect the browser to
 * Supabase's authorize endpoint, Google signs the person in, and Supabase
 * redirects back with the session in the URL fragment, which we parse on load.
 *
 * Web-only: the redirect flow needs a browser. Native builds keep the handle
 * based sign-in; a real native app would use a deep-link OAuth flow here.
 * Everything degrades to a safe no-op when Supabase isn't configured.
 */
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { sharedEnabled } from './shared';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  user: AuthUser;
};

/** Google sign-in is available when Supabase is configured and we're on web. */
export function googleAuthEnabled(): boolean {
  return sharedEnabled() && Platform.OS === 'web';
}

/** The page URL Supabase redirects back to (must be in the project's allow-list). */
function redirectUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
}

/** Kick off Google OAuth — navigates away to Google via Supabase's authorize URL. */
export function signInWithGoogle(): void {
  if (typeof window === 'undefined' || !SUPABASE_URL) return;
  const url =
    `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectUrl())}`;
  window.location.href = url;
}

function headers(token?: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Strip the OAuth fragment/query from the URL after we've read it. */
function cleanUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search.replace(/[?&](error|error_description|code)=[^&]*/g, ''));
  } catch {
    // ignore
  }
}

/**
 * On load, read an OAuth callback. Implicit flow puts the session in the URL
 * fragment (#access_token=…). Returns a partial session (user filled in later
 * by fetchAuthUser) or a provider error, and cleans the URL either way.
 */
export function consumeAuthRedirect(): { session?: Session; error?: string } {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!raw) return {};
  const p = new URLSearchParams(raw);
  const err = p.get('error_description') || p.get('error');
  const access_token = p.get('access_token');
  if (err) {
    cleanUrl();
    return { error: err };
  }
  if (!access_token) return {};
  const refresh_token = p.get('refresh_token') || '';
  const expires_in = Number(p.get('expires_in') || '3600');
  cleanUrl();
  return {
    session: {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
      user: { id: '', email: '', name: '' },
    },
  };
}

/** Fetch the signed-in user (identity comes from Google via Supabase). */
export async function fetchAuthUser(accessToken: string): Promise<AuthUser | null> {
  if (!SUPABASE_URL || !accessToken) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(accessToken) });
    if (!res.ok) return null;
    const u = await res.json();
    const meta = u.user_metadata || {};
    const email: string = u.email || meta.email || '';
    return {
      id: u.id,
      email,
      name: meta.full_name || meta.name || (email ? email.split('@')[0] : 'New Nomad'),
      avatarUrl: meta.avatar_url || meta.picture || undefined,
    };
  } catch {
    return null;
  }
}

/** Exchange a refresh token for a fresh session (called when the stored one expired). */
export async function refreshSession(refreshToken: string): Promise<Session | null> {
  if (!SUPABASE_URL || !refreshToken) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.access_token) return null;
    const user = (await fetchAuthUser(d.access_token)) || { id: '', email: '', name: '' };
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token || refreshToken,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      user,
    };
  } catch {
    return null;
  }
}

/** Best-effort server-side sign-out (revokes the refresh token). */
export async function signOutRemote(accessToken: string): Promise<void> {
  if (!SUPABASE_URL || !accessToken) return;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: headers(accessToken) });
  } catch {
    // ignore
  }
}
