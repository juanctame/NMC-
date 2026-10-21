/**
 * Staying current between visits. Every deploy publishes `version.json` (the
 * build id + when it was built) and `data/*.json` (the latest discovered spots,
 * re-swept on each deploy). The app reads them fresh — bypassing the cache — at
 * launch and whenever it comes back to the foreground, so an open tab or a
 * home-screen install learns about a newer build and newer spots without a
 * reinstall. Web-only (native builds update through the store).
 */
import { Platform } from 'react-native';
import { APP_VERSION } from './cloud';

export type LiveVersion = { build: string; built_at: string };

/** Where the deployed site lives (this page's folder). */
export function siteBase(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  const p = window.location.pathname;
  return window.location.origin + p.slice(0, p.lastIndexOf('/') + 1);
}

/** Fetch a published JSON file fresh (no HTTP cache), or null. */
export async function freshJson<T>(rel: string, ms = 9000): Promise<T | null> {
  const base = siteBase();
  if (!base) return null;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(`${base}${rel}${rel.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** The build that's live right now, when it differs from the one running. */
export async function newerBuild(): Promise<LiveVersion | null> {
  if (APP_VERSION === 'dev') return null;
  const v = await freshJson<LiveVersion>('version.json');
  return v && v.build && v.build !== APP_VERSION ? v : null;
}

/** Calls `cb` on launch and each time the app returns after `minAwayMs`. */
export function onEachUse(cb: () => void, minAwayMs = 5 * 60_000): () => void {
  cb();
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => {};
  let hiddenAt = 0;
  const h = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt >= minAwayMs) cb();
  };
  document.addEventListener('visibilitychange', h);
  return () => document.removeEventListener('visibilitychange', h);
}
