/**
 * Creator clips for a place (web). Uses the CI-collected clips when present
 * (data/clips.ts); otherwise searches YouTube live — by the venue's hashtag /
 * name — and keeps only third-party, high-quality, embeddable clips (the same
 * rules as CI, data/clipRank.ts). Results are cached per device for a day, and
 * a disabled API / spent quota backs off for 6 h so nothing hammers the key.
 * Clips play inside the app through YouTube's embedded player.
 */
import type { Place } from '../store/data';
import type { City } from './cities';
import type { TrendingVideo } from './videos';
import { collectedClips } from './clips';
import { rankClips, clipQuery, toYtVideo, type Clip, type VenueRef } from './clipRank';
import { YOUTUBE_API_KEY } from '../config';

const CACHE = 'nmc.clips.v1';
const DOWN = 'nmc.clips.down';
const TTL = 24 * 36e5;
const BACKOFF = 6 * 36e5;

export function youtubeEnabled(): boolean {
  return !!YOUTUBE_API_KEY;
}

function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readCache(): Record<string, { at: number; clips: Clip[] }> {
  try {
    return JSON.parse(store()?.getItem(CACHE) || '{}');
  } catch {
    return {};
  }
}

function apiDown(): boolean {
  const at = Number(store()?.getItem(DOWN) || 0);
  return Date.now() - at < BACKOFF;
}

export function venueRef(p: Place): VenueRef {
  return { id: p.id, name: p.name, hood: p.hood, instagram: p.instagram, website: p.website, chef: p.chef };
}

async function yt(path: string, params: Record<string, string>): Promise<any> {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key: YOUTUBE_API_KEY })}`);
  const d = await r.json().catch(() => ({}));
  if (d?.error) {
    const reason = d.error.errors?.[0]?.reason || '';
    if (/accessNotConfigured|SERVICE_DISABLED|quota|keyInvalid|forbidden|ipRefererBlocked/i.test(reason)) {
      try {
        store()?.setItem(DOWN, String(Date.now()));
      } catch {}
    }
    throw new Error(reason || 'youtube error');
  }
  return d;
}

/** Best third-party HD clips about this place, best first (empty on any failure). */
export async function searchPlaceVideos(place: Place, _city?: City): Promise<TrendingVideo[]> {
  const collected = collectedClips(place.id);
  if (collected) return collected;
  if (!YOUTUBE_API_KEY || apiDown()) return [];
  const cache = readCache();
  const hit = cache[place.id];
  if (hit && Date.now() - hit.at < TTL) return hit.clips;
  try {
    const ref = venueRef(place);
    const s = await yt('search', {
      part: 'snippet',
      type: 'video',
      q: clipQuery(ref),
      maxResults: '25',
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
      regionCode: 'MX',
      relevanceLanguage: 'es',
    });
    const ids: string[] = (s.items || []).map((it: any) => it?.id?.videoId).filter(Boolean);
    const d = ids.length ? await yt('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.join(',') }) : { items: [] };
    const clips = rankClips(ref, (d.items || []).map((it: any) => toYtVideo(it)));
    try {
      store()?.setItem(CACHE, JSON.stringify({ ...cache, [place.id]: { at: Date.now(), clips } }));
    } catch {}
    return clips;
  } catch {
    return [];
  }
}
