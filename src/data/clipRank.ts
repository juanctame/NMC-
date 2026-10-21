/**
 * Clip quality & provenance rules — which YouTube videos found by a restaurant's
 * hashtag are good enough to show, and in what order.
 *
 * Shared by the app (live fallback, videosLive.web.ts) and the CI collector
 * (scripts/collect-videos.mjs, which transpiles this file), so both apply the
 * exact same rules. Pure functions only — no imports at runtime.
 *
 * A clip is kept only if it is:
 *  - about the venue: its name (or hashtag) appears in the title / description /
 *    tags; short or generic names (Em, Max, Gia…) also need a CDMX cue;
 *  - third-party: not posted by the restaurant (name / Instagram handle /
 *    website) or its own chef — creators, critics and diners only;
 *  - high quality: HD, embeddable & public, 10 s – 20 min, with real views.
 * Survivors are ranked by reach (views), approval (like ratio), recency, with a
 * small bonus for short-form (vertical-length) clips.
 */
import type { TrendingVideo } from './videos';

/** A YouTube search hit merged with its videos.list details. */
export type YtVideo = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumb?: string;
  definition?: string; // 'hd' | 'sd'
  durationSec: number;
  views: number;
  likes: number;
  embeddable: boolean;
  isPublic: boolean;
};

/** A ranked, playable clip (TrendingVideo + the quality signals behind it). */
export type Clip = TrendingVideo & {
  views: number;
  likes: number;
  durationSec: number;
  hd: boolean;
  score: number;
};

export type VenueRef = {
  id: string;
  name: string;
  hood?: string;
  instagram?: string;
  website?: string;
  chef?: string;
};

const fold = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const squash = (s: string) => fold(s).replace(/\s+/g, '');

/** "Panadería Rosetta" → "PanaderiaRosetta" (same rule as hashtags.ts). */
export function tagOf(name: string): string {
  return fold(name)
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

/** The YouTube query: the venue's hashtag OR its quoted name in CDMX. */
export function clipQuery(v: VenueRef): string {
  return `#${tagOf(v.name)}|"${v.name}" cdmx`;
}

/** ISO-8601 duration (PT1M5S) → seconds. */
export function isoSeconds(iso: string): number {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return 0;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + +(m[4] || 0);
}

const CDMX = /\b(cdmx|ciudad de mexico|mexico city|df|mexico df|chilango)\b/;
const FOOD = /\b(restaurantes?|restaurant|taqueria|tacos?|comida|food|menu|chef|cena|omakase|degustacion|tasting|bar|cafe|cocina|mexico|brunch|desayuno|mariscos|pizza|sushi|mezcal|cocteles?)\b/;

/** Is the video actually about this venue? */
export function isAboutVenue(v: VenueRef, x: Pick<YtVideo, 'title' | 'description' | 'tags'>): boolean {
  const text = ' ' + fold([x.title, x.description, ...(x.tags || [])].join(' ')) + ' ';
  const name = fold(v.name);
  const tag = squash(v.name);
  // #ElVilsito folds to the single word "elvilsito"; tags are matched whole.
  const hasTag = text.includes(' ' + tag + ' ') || (x.tags || []).some((t) => squash(t) === tag);
  const hasName = name.length > 0 && text.includes(' ' + name + ' ');
  if (!hasName && !hasTag) return false;
  // Very short names (Em, Max) need a CDMX / neighbourhood cue; other one-word
  // names need at least some restaurant or food context around them.
  const hood = v.hood ? fold(v.hood) : '';
  const place = CDMX.test(text) || (!!hood && text.includes(' ' + hood + ' '));
  if (name.length < 4) return place;
  if (!name.includes(' ')) return place || FOOD.test(text);
  return true;
}

/** Was it posted by someone other than the restaurant or its own chef? */
export function isThirdParty(v: VenueRef, channelTitle: string): boolean {
  const ch = squash(channelTitle);
  if (!ch) return false;
  const name = squash(v.name);
  const own = [
    name.length >= 4 ? name : '',
    v.instagram ? squash(v.instagram.replace(/^@/, '')) : '',
    v.website ? squash((v.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[./]/)[0]) || '') : '',
    ...(v.chef || '')
      .replace(/\([^)]*\)/g, ' ')
      .split(/\s+y\s+|\s+e\s+|,|·/)
      .map((c) => squash(c))
      .filter((c) => c.length >= 6),
  ].filter((x) => x.length >= 3);
  return !own.some((o) => ch.includes(o) || (ch.length >= 5 && o.includes(ch)));
}

/** HD, playable in-app, a watchable length, and seen by real people. */
export function isQuality(x: YtVideo): boolean {
  return x.embeddable && x.isPublic && x.definition === 'hd' && x.durationSec >= 10 && x.durationSec <= 1200 && x.views >= 300;
}

export function clipScore(x: YtVideo, now = Date.now()): number {
  const ageDays = Math.max(1, (now - Date.parse(x.publishedAt || '')) / 864e5 || 3650);
  const likeRatio = x.views ? Math.min(0.1, x.likes / x.views) : 0;
  const recency = ageDays <= 60 ? 1.5 : ageDays <= 365 ? 1 : ageDays <= 730 ? 0.4 : 0;
  const shortForm = x.durationSec <= 90 ? 0.5 : 0;
  return Math.log10(x.views + 1) + likeRatio * 15 + recency + shortForm;
}

/** Filter + rank one venue's search results into playable clips (best first). */
export function rankClips(v: VenueRef, items: YtVideo[], max = 8, now = Date.now()): Clip[] {
  const seen = new Set<string>();
  const perCreator: Record<string, number> = {};
  return items
    .filter((x) => !seen.has(x.id) && seen.add(x.id))
    .filter((x) => isQuality(x) && isAboutVenue(v, x) && isThirdParty(v, x.channelTitle))
    .map((x) => ({ x, score: clipScore(x, now) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ x }) => (perCreator[x.channelId] = (perCreator[x.channelId] || 0) + 1) <= 2) // variety: ≤2 per creator
    .slice(0, max)
    .map(({ x, score }) => ({
      id: 'yt-' + x.id,
      placeId: v.id,
      platform: 'youtube' as const,
      creator: x.channelTitle,
      handle: '',
      caption: x.title,
      sourceUrl: 'https://www.youtube.com/watch?v=' + x.id,
      embedId: x.id,
      thumb: x.thumb,
      publishedAt: x.publishedAt,
      views: x.views,
      likes: x.likes,
      durationSec: x.durationSec,
      hd: x.definition === 'hd',
      score: Math.round(score * 100) / 100,
    }));
}

/** Normalize YouTube API JSON (search item + videos.list item) into a YtVideo. */
export function toYtVideo(detail: any, fallback?: any): YtVideo {
  const sn = detail?.snippet || fallback?.snippet || {};
  const th = sn.thumbnails || {};
  const st = detail?.statistics || {};
  const ent = (s: string) =>
    (s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return {
    id: detail?.id || fallback?.id?.videoId || '',
    title: ent(sn.title || ''),
    description: ent(sn.description || ''),
    tags: Array.isArray(sn.tags) ? sn.tags : [],
    channelId: sn.channelId || '',
    channelTitle: sn.channelTitle || '',
    publishedAt: sn.publishedAt || '',
    thumb: th.maxres?.url || th.standard?.url || th.high?.url || th.medium?.url || th.default?.url,
    definition: detail?.contentDetails?.definition,
    durationSec: isoSeconds(detail?.contentDetails?.duration || ''),
    views: Number(st.viewCount) || 0,
    likes: Number(st.likeCount) || 0,
    embeddable: detail?.status?.embeddable !== false,
    isPublic: (detail?.status?.privacyStatus || 'public') === 'public',
  };
}
