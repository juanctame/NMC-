/**
 * Critics — real content creators and food media, connected from the clips
 * they actually published about guide restaurants (src/data/videos.json +
 * clipsOpen.json), merged across platforms by handle.
 *
 * Each profile is SIMULATED in one precise sense: CRTQ reads their content and
 * derives a verdict and a 0–10 score per restaurant from it, plus a palate from
 * where they eat. The words are always theirs (the clip's own title, quoted and
 * linked) or a reported paraphrase with its source; the verdict and score are
 * ours, and the app labels them as such. Nothing is put in their mouths, no
 * follower counts are guessed, and only accounts with evidence are linked.
 */
import type { Place } from '../store/data';
import { byId as seedById } from '../store/data';
import { CARTE_CDMX } from './carte';
import { collectedClips, collectedVenueIds } from './clips';
import type { Clip } from './clipRank';
import type { VideoSource } from './videos';
import { computePalate, type Palate } from './palate';
import { CREATOR_EXTRA, OUTLET_RE, type ExtraLink, type ReportedTake } from './creatorLinks';

export type Verdict = 'rave' | 'recommends' | 'features' | 'weighs' | 'reports' | 'acclaim' | 'critical';

export const VERDICT_LABEL: Record<Verdict, string> = {
  rave: 'Rave',
  recommends: 'Recommends',
  features: 'Features',
  weighs: 'Weighs it up',
  reports: 'Reports',
  acclaim: 'Reports acclaim',
  critical: 'Critical',
};

/** One critic's take on one restaurant. */
export type Take = {
  placeId: string;
  verdict: Verdict;
  /** CRTQ's simulated 0–10 reading of their content. */
  score: number;
  /** Their own words: the clip title (or the reported paraphrase). */
  quote: string;
  kind: 'clip' | 'reported';
  clip?: Clip;
  /** Other clips they made about the same place. */
  more: number;
  sourceUrl: string;
  outlet?: string;
  date?: string;
};

export type Account = { platform: VideoSource | ExtraLink['platform']; label: string; url: string; evidence: string };

export type Critic = {
  id: string;
  name: string;
  handle: string;
  kind: 'creator' | 'outlet';
  bio?: string;
  bioSource?: string;
  accounts: Account[];
  takes: Take[];
  clipCount: number;
  avg: number;
  hoods: string[];
  platforms: VideoSource[];
  /** Language of their titles, when it's clear. */
  lang: 'es' | 'en' | 'es · en' | null;
  shortForm: number; // share of vertical clips 0..1
  palate: Palate;
  /** One-line simulated summary of their beat, derived from the takes. */
  summary: string;
};

const fold = (s: string) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const keyOf = (handle: string) => {
  let h = String(handle || '');
  try {
    h = decodeURIComponent(h);
  } catch {
    /* keep raw */
  }
  return fold(h).replace(/^@+/, '').replace(/[^a-z0-9]/g, '');
};

const RAVE =
  /\bbest\b|\bmejor(es)?\b|favou?rite|favorit|bucket.?list|must.?(try|visit|eat)|increible|amazing|insane|legendar|obsess|\bperfect\b|\b10+\/10\b|world'?s (most|best)|\btop \d|no notes|hands down|go-?tos?\b|most popular|mas famos|most famous|famous|famos|lo mejor|single favou?rite/;
const CRITICAL = /overrated|not worth|no vale la pena\b(?!\?)|decepcion|disappoint|worst|\bpeor\b|tourist trap|mal servicio|bad service|critical review|nunca volver|never again|gentrificacion/;
const WEIGHS = /honest review|resena honesta|vale la pena\?|worth it\?|\?|¿/;
const RECOMMENDS =
  /recommend|recomiend|\btry\b|probe|probamos|visitamos|debes|should|\blove\b|delicious|delicios|\brico\b|sabor|homenaje|patrimonio|labor of love|secreto|secret|esencia|tradicional|traditional|joy|amor|consiente|antoj/;
const ACCLAIM = /best new chef|michelin|estrella|50 best|50 mejores|10 mejores|mejores restaurantes|mejor restaurante|award|premio|distinguid|reconoc/;

/** Read a verdict from their own title — the words are theirs, the reading is ours. */
export function verdictOf(title: string, kind: 'creator' | 'outlet'): Verdict {
  const t = fold(title);
  if (CRITICAL.test(t)) return 'critical';
  if (kind === 'outlet' && ACCLAIM.test(t)) return 'acclaim';
  if (RAVE.test(t)) return 'rave';
  if (WEIGHS.test(t)) return 'weighs';
  if (RECOMMENDS.test(t)) return 'recommends';
  return kind === 'outlet' ? 'reports' : 'features';
}

const BASE: Record<Verdict, number> = { rave: 9.3, acclaim: 8.9, recommends: 8.6, features: 7.9, reports: 7.8, weighs: 7.4, critical: 5.6 };
const RANK: Record<Verdict, number> = { rave: 6, acclaim: 5, recommends: 4, critical: 3, weighs: 2, features: 1, reports: 0 };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}
const simScore = (v: Verdict, seed: string) => Math.round(Math.min(9.8, Math.max(3, BASE[v] + (hash(seed) - 0.5) * 0.5)) * 10) / 10;

const accountUrl = (platform: VideoSource, h: string): string | null => {
  const bare = h.replace(/^@/, '');
  if (!bare) return null;
  if (platform === 'youtube') return `https://www.youtube.com/@${bare}`;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${bare}`;
  if (platform === 'dailymotion') return `https://www.dailymotion.com/${bare}`;
  if (platform === 'instagram') return `https://www.instagram.com/${bare}/`;
  return null;
};

/** "Connie┃NYC Foodie" → "Connie", "Refri 🌮" → "Refri", "LUISCARLOSZARA" kept unless overridden. */
function cleanName(n: string): string {
  const first = String(n || '')
    .split(/[┃|•·✨]/)
    .map((x) => x.replace(/[^\p{L}\p{N}&'’.\- ]/gu, '').trim())
    .find(Boolean);
  return first || n;
}

const ES_W = /\b(el|la|los|las|de|del|en|y|con|para|que|por|mejor|mejores|un|una|desde|esta|este|nuestro|nuestras|visitamos|sabor|probamos|comida)\b/gi;
const EN_W = /\b(the|and|of|in|best|at|to|my|is|this|for|with|off|one|we|our|by|what|looks|like|trying|day|night)\b/gi;
const langOf = (t: string): 'es' | 'en' | null => {
  const es = (t.match(ES_W) || []).length + (/[ñ¿¡]/.test(t) ? 2 : 0);
  const en = (t.match(EN_W) || []).length;
  return es === en ? null : es > en ? 'es' : 'en';
};

const placeFor = (() => {
  const m: Record<string, Place> = {};
  CARTE_CDMX.forEach((p) => (m[p.id] = p));
  return (id: string): Place | undefined => m[id] || seedById[id];
})();

function build(): Critic[] {
  type Acc = { handles: Record<string, string>; names: Record<string, number>; clips: Clip[] };
  const by: Record<string, Acc> = {};
  for (const placeId of collectedVenueIds()) {
    if (!placeFor(placeId)) continue;
    for (const c of collectedClips(placeId) || []) {
      if (c.src || (c.scope && c.scope !== 'venue')) continue; // open files aren't critics; related footage isn't a take
      if (!['youtube', 'tiktok', 'dailymotion', 'instagram', 'vimeo'].includes(c.platform)) continue;
      const k = keyOf(c.handle || c.creator);
      if (!k) continue;
      const a = (by[k] = by[k] || { handles: {}, names: {}, clips: [] });
      if (c.handle) a.handles[c.platform] = c.handle;
      a.names[c.creator] = (a.names[c.creator] || 0) + 1;
      if (!a.clips.some((x) => x.id === c.id)) a.clips.push(c);
    }
  }

  const out: Critic[] = [];
  for (const [k, a] of Object.entries(by)) {
    const extra = CREATOR_EXTRA[k] || {};
    // Most used display name, preferring Mixed Case over ALL CAPS.
    const rawName = Object.entries(a.names).sort((x, y) => y[1] - x[1] || Number(x[0] === x[0].toUpperCase()) - Number(y[0] === y[0].toUpperCase()))[0][0];
    const name = extra.name || cleanName(rawName);
    const kind = extra.kind || (OUTLET_RE.test(fold(name)) ? 'outlet' : 'creator');
    const firstHandle = Object.values(a.handles)[0] || '@' + k;
    let handle = firstHandle;
    try {
      handle = decodeURIComponent(firstHandle);
    } catch {
      /* raw */
    }

    // Connected accounts: proven by the clips they posted, then sourced extras.
    const accounts: Account[] = [];
    for (const [platform, h] of Object.entries(a.handles) as [VideoSource, string][]) {
      const url = accountUrl(platform, h);
      let label = h;
      try {
        label = decodeURIComponent(h);
      } catch {
        /* raw */
      }
      if (url) accounts.push({ platform, label, url, evidence: 'Posted the clips below' });
    }
    for (const l of extra.links || []) accounts.push({ platform: l.platform, label: l.label, url: l.url, evidence: l.source ? 'Listed on ' + l.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'Official site' });

    // One take per restaurant: their most emphatic clip about it.
    const perPlace: Record<string, Clip[]> = {};
    a.clips.forEach((c) => (perPlace[c.placeId] = perPlace[c.placeId] || []).push(c));
    const takes: Take[] = Object.entries(perPlace).map(([placeId, clips]) => {
      const scored = clips.map((c) => ({ c, v: verdictOf(c.caption, kind) })).sort((x, y) => RANK[y.v] - RANK[x.v] || (y.c.views || 0) - (x.c.views || 0));
      const { c, v } = scored[0];
      return { placeId, verdict: v, score: simScore(v, k + placeId), quote: c.caption, kind: 'clip', clip: c, more: clips.length - 1, sourceUrl: c.sourceUrl, date: c.publishedAt };
    });
    for (const r of extra.reported || ([] as ReportedTake[])) {
      if (!placeFor(r.placeId)) continue;
      const i = takes.findIndex((t) => t.placeId === r.placeId);
      const t: Take = { placeId: r.placeId, verdict: r.verdict, score: simScore(r.verdict, k + r.placeId), quote: r.text, kind: 'reported', more: 0, sourceUrl: r.url, outlet: r.outlet, date: r.date };
      if (i >= 0 && RANK[takes[i].verdict] >= RANK[r.verdict]) continue;
      if (i >= 0) takes[i] = { ...t, more: takes[i].more + 1, clip: takes[i].clip };
      else takes.push(t);
    }
    takes.sort((x, y) => y.score - x.score);

    const places = takes.map((t) => placeFor(t.placeId)!).filter(Boolean);
    const hoods = [...new Set(places.map((p) => (p.hood === 'Roma Nte' ? 'Roma Norte' : p.hood)).filter(Boolean))];
    const langs = new Set(a.clips.map((c) => langOf(c.caption)).filter(Boolean));
    const lang: Critic['lang'] = langs.size === 2 ? 'es · en' : langs.has('en') ? 'en' : langs.has('es') ? 'es' : null;
    const palate = computePalate(places.map((p, i) => ({ ...p, score: takes[i].score })));
    const counts = takes.reduce<Record<string, number>>((m, t) => ((m[t.verdict] = (m[t.verdict] || 0) + 1), m), {});
    const tally = (['rave', 'acclaim', 'recommends', 'weighs', 'critical'] as Verdict[])
      .filter((v) => counts[v])
      .map((v) => `${counts[v]} ${VERDICT_LABEL[v].toLowerCase()}${counts[v] > 1 && v === 'rave' ? 's' : ''}`)
      .join(', ');
    const where = hoods.length ? (hoods.length > 2 ? `${hoods.slice(0, 2).join(', ')} and ${hoods.length - 2} more` : hoods.join(' and ')) : 'Mexico City';
    const summary = `${takes.length} ${takes.length === 1 ? 'restaurant' : 'restaurants'} on camera across ${where}${tally ? ` — ${tally}` : ''}.`;

    out.push({
      id: k,
      name,
      handle,
      kind,
      bio: extra.bio,
      bioSource: extra.bioSource,
      accounts,
      takes,
      clipCount: a.clips.length,
      avg: Math.round((takes.reduce((n, t) => n + t.score, 0) / Math.max(1, takes.length)) * 10) / 10,
      hoods,
      platforms: [...new Set(a.clips.map((c) => c.platform))],
      lang,
      shortForm: a.clips.filter((c) => c.vertical).length / Math.max(1, a.clips.length),
      palate,
      summary,
    });
  }
  // Most coverage first; independent creators before outlets on ties.
  return out.sort((x, y) => y.takes.length - x.takes.length || Number(x.kind === 'outlet') - Number(y.kind === 'outlet') || y.clipCount - x.clipCount);
}

export const CRITICS: Critic[] = build();
const byKey: Record<string, Critic> = {};
CRITICS.forEach((c) => (byKey[c.id] = c));

export const criticById = (id: string | null | undefined) => (id ? byKey[id] : undefined);

/** The critic behind a clip (by its handle / creator name). */
export const criticForClip = (c: { handle?: string; creator: string }) => byKey[keyOf(c.handle || c.creator)];

/** Every critic's take on one restaurant, best first. */
export function takesForPlace(placeId: string): { critic: Critic; take: Take }[] {
  const out: { critic: Critic; take: Take }[] = [];
  for (const critic of CRITICS) {
    const take = critic.takes.find((t) => t.placeId === placeId);
    if (take) out.push({ critic, take });
  }
  return out.sort((a, b) => Number(a.critic.kind === 'outlet') - Number(b.critic.kind === 'outlet') || b.take.score - a.take.score);
}

/** Simulated consensus for a restaurant: the mean of the critics' readings. */
export function consensusFor(placeId: string): { score: number; n: number } | null {
  const ts = takesForPlace(placeId);
  if (!ts.length) return null;
  return { score: Math.round((ts.reduce((n, x) => n + x.take.score, 0) / ts.length) * 10) / 10, n: ts.length };
}

/** Creators (not outlets) first — the tastemakers rail. */
export const FEATURED_CRITICS: Critic[] = CRITICS.filter((c) => c.kind === 'creator').concat(CRITICS.filter((c) => c.kind === 'outlet')).slice(0, 12);
