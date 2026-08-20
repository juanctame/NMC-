/**
 * Single application store (Zustand). Mirrors the prototype's `this.state` and
 * its methods. Per-screen view-models are derived inside the screen components
 * from this state plus the static data in ./data.
 */
import { create } from 'zustand';
import {
  RANKED0,
  WANT0,
  byId,
  BANDS,
  WHEN_OPTS,
  CAND,
  EVENTS,
  OPEN,
  type Place,
} from './data';
import { PHOTO_POOL } from '../assets';
import { DEFAULT_CITY, cityById, type City } from '../data/cities';
import { getProvider, fixtureFallback } from '../data/provider';
import { REVIEWS, DISH_PHOTOS, type Review } from '../data/reviews';
import { fetchSharedReviews, pushSharedReview } from '../data/shared';
import { makeProfile, makeProfileFromAuth, identity, type Profile } from '../data/profile';
import {
  loadProfile,
  saveProfile,
  clearProfile,
  loadLang,
  saveLang,
  loadSession,
  saveSession,
  clearSession,
} from '../data/storage';
import {
  registerProfile,
  fetchProfileByHandle,
  fetchProfileByEmail,
  handleFromEmail,
  uniqueHandle,
} from '../data/accounts';
import {
  signInWithGoogle as authSignInWithGoogle,
  consumeAuthRedirect,
  fetchAuthUser,
  refreshSession,
  signOutRemote,
  type Session,
  type AuthUser,
} from '../data/auth';
import { TRENDING_VIDEOS, type TrendingVideo } from '../data/videos';
import { searchPlaceVideos } from '../data/videosLive';
import type { Lang } from '../i18n';

export type NearbyStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';
export type VideoStatus = 'idle' | 'loading' | 'ready' | 'empty';
export type ReviewSort = 'popular' | 'recent';
export type ScoredReview = Review & { likes: number; likedByMe: boolean };

/** Public reviews for a place: seed ∪ user, like-counted, filtered, sorted. */
export function reviewsFor(
  placeId: string,
  userReviews: Review[],
  reviewLikes: Record<string, boolean>,
  opts: { friendsOnly: boolean; sort: ReviewSort },
  sharedReviews: Review[] = [],
): ScoredReview[] {
  const seen = new Set<string>();
  const raw: Review[] = [];
  for (const r of [...userReviews, ...sharedReviews, ...REVIEWS]) {
    if (r.placeId !== placeId || seen.has(r.id)) continue;
    seen.add(r.id);
    raw.push(r);
  }
  let list: ScoredReview[] = raw.map((r) => ({
    ...r,
    likes: r.baseLikes + (reviewLikes[r.id] ? 1 : 0),
    likedByMe: !!reviewLikes[r.id],
  }));
  if (opts.friendsOnly) list = list.filter((r) => r.friend);
  if (opts.sort === 'popular') list = list.slice().sort((a, b) => b.likes - a.likes);
  return list;
}

export type PopularDish = {
  name: string;
  count: number;
  photo: string;
  score: number; // average rating among the diners who chose it
  fans: { initials: string; color: string }[];
};

/** The most-named favourite dish for a place, across every review (seed ∪ user),
 *  tie-broken by total likes. Independent of the friends filter — it's the
 *  whole table's favourite. */
export function popularDishFor(placeId: string, userReviews: Review[], sharedReviews: Review[] = []): PopularDish | null {
  const seen = new Set<string>();
  const forPlace: Review[] = [];
  for (const r of [...userReviews, ...sharedReviews, ...REVIEWS]) {
    if (r.placeId !== placeId || seen.has(r.id)) continue;
    seen.add(r.id);
    forPlace.push(r);
  }
  const withDish = forPlace.filter((r) => r.dish && r.dish.trim());
  if (!withDish.length) return null;

  const groups: Record<string, Review[]> = {};
  const label: Record<string, string> = {};
  withDish.forEach((r) => {
    const key = r.dish!.trim().toLowerCase();
    (groups[key] = groups[key] || []).push(r);
    if (!label[key]) label[key] = r.dish!.trim();
  });

  const top = Object.keys(groups).sort((a, b) => {
    const g = groups[b].length - groups[a].length;
    if (g !== 0) return g;
    const likes = (k: string) => groups[k].reduce((n, r) => n + r.baseLikes, 0);
    return likes(b) - likes(a);
  })[0];

  const revs = groups[top];
  const withPhoto = revs.find((r) => r.dishPhoto);
  return {
    name: label[top],
    count: revs.length,
    photo: withPhoto?.dishPhoto || 'chef-plating',
    score: revs.reduce((n, r) => n + r.score, 0) / revs.length,
    fans: revs.slice(0, 5).map((r) => ({ initials: r.initials, color: r.color })),
  };
}

/** Set false to run the designed first-run onboarding flow on launch. */
export const SKIP_ONBOARDING = false;

export type Screen =
  | 'feed'
  | 'log'
  | 'board'
  | 'you'
  | 'place'
  | 'onboard'
  | 'table'
  | 'event'
  | 'ticket'
  | 'thread'
  | 'club'
  | 'map'
  | 'reel';

export type PinRef = { kind: string; id: string } | null;
export type CreatedTable = (typeof EVENTS)[number] & { mine: true };

export type State = {
  tab: 'feed' | 'log' | 'table' | 'you';
  screen: Screen;
  returnTo: Screen;
  activePlaceId: string | null;

  obStep: number;
  tastes: string[];
  stamped: boolean;

  logSeg: 'been' | 'want' | 'recs';
  tableSeg: 'events' | 'community';

  ranked: Place[];
  wantIds: string[];

  liked: Record<string, boolean>;
  saved: Record<string, boolean>;
  follows: Record<string, boolean>;

  rankOpen: boolean;
  rankStep: 'pick' | 'bucket' | 'compare' | 'result';
  rankId: string | null;
  rankSearch: string;
  band: [number, number] | null;
  sub: number[];
  clo: number;
  chi: number;
  cmpCount: number;
  resPos: number | null;
  resScore: number | null;

  activeEventId: string | null;
  diet: string[];
  rsvped: Record<string, boolean>;
  waitlisted: Record<string, boolean>;
  ticketId: string | null;

  activeThreadId: string | null;
  threadAdded: Record<string, any[]>;
  draft: string;
  attachOpen: boolean;

  clubSeat: boolean;
  clubReq: Record<string, boolean>;

  mapFilter: string;
  selPin: PinRef;

  createdTables: any[];
  createOpen: boolean;
  createMode: 'table' | 'event';
  cPlaceId: string;
  cWhen: string;
  cSeats: number;
  cVisibility: 'public' | 'private';
  cTitle: string;
  cDesc: string;

  clubUnlocked: boolean;
  logoTaps: number;
  lastTap: number;
  clubSeg: 'events' | 'community';

  userPhotos: Record<string, string[]>;
  reelIndex: number;

  // Live restaurant data (per selected city)
  city: City;
  nearby: Place[];
  nearbyById: Record<string, Place>;
  nearbyStatus: NearbyStatus;
  citySheetOpen: boolean;

  // Reviews (public, Letterboxd-style)
  userReviews: Review[];
  sharedReviews: Review[]; // reviews from other testers (Supabase), when enabled
  reviewLikes: Record<string, boolean>;
  reviewSort: ReviewSort;
  reviewFriendsOnly: boolean;
  reviewOpen: boolean;
  reviewPlaceId: string | null;
  reviewDraftScore: number;
  reviewDraftText: string;
  reviewDraftDish: string;
  reviewDraftDishPhoto: string;

  // Account (local profile)
  profile: Profile | null;
  hydrated: boolean;

  // Auth (Supabase — Google sign-in)
  authUser: AuthUser | null;
  session: Session | null;
  authError: string | null;

  // Language (flag-picked i18n)
  lang: Lang;

  // Hashtag videos: real clips per place (YouTube), + the embed playing now
  placeVideos: Record<string, TrendingVideo[]>;
  placeVideosStatus: Record<string, VideoStatus>;
  videoUrl: string | null;
};

export type Actions = {
  // navigation
  go: (tab: State['tab']) => void;
  setScreen: (screen: Screen) => void;
  openPlace: (id: string) => void;
  closePlace: () => void;
  openMap: () => void;
  closeMap: () => void;
  openEvent: (id: string) => void;
  goClub: () => void;
  openReel: (i: number) => void;
  reelGo: (d: number) => void;
  // onboarding
  obNext: () => void;
  obSkip: () => void;
  stampMe: () => void;
  toggleTaste: (name: string) => void;
  // rank flow
  startRank: (id: string | null) => void;
  closeRank: () => void;
  setRankSearch: (q: string) => void;
  pickRank: (id: string) => void;
  chooseBucket: (key: 'loved' | 'fine' | 'meh') => void;
  doCompare: (newWins: boolean) => void;
  rankAgain: () => void;
  seeLog: () => void;
  // social
  toggleLike: (key: string) => void;
  toggleSave: (id: string) => void;
  toggleWant: (id: string) => void;
  toggleFollow: (id: string) => void;
  addPhoto: (id: string) => void;
  // tables / events
  setTableSeg: (seg: 'events' | 'community') => void;
  setLogSeg: (seg: 'been' | 'want' | 'recs') => void;
  joinTable: (id: string, full: boolean) => void;
  rsvp: () => void;
  openCreate: (mode?: 'table' | 'event') => void;
  closeCreate: () => void;
  setCreate: (patch: Partial<State>) => void;
  createTable: () => void;
  // club
  tapLogo: () => void;
  requestClub: (id: string) => void;
  setClubSeg: (seg: 'events' | 'community') => void;
  // community
  openThread: (id: string) => void;
  setDraft: (t: string) => void;
  sendMsg: () => void;
  insertApp: (app: any) => void;
  openAttach: () => void;
  closeAttach: () => void;
  // map / event helpers
  setMapFilter: (f: State['mapFilter']) => void;
  selectPin: (pin: PinRef) => void;
  toggleDiet: (name: string) => void;
  // create-table visibility
  setVisibility: (v: 'public' | 'private') => void;
  // live data
  loadNearby: () => Promise<void>;
  setCity: (id: string) => void;
  openCitySheet: () => void;
  closeCitySheet: () => void;
  // reviews
  toggleReviewLike: (id: string) => void;
  setReviewSort: (s: ReviewSort) => void;
  setReviewFriendsOnly: (v: boolean) => void;
  openReviewComposer: (placeId: string) => void;
  closeReviewComposer: () => void;
  setReviewDraftScore: (n: number) => void;
  setReviewDraftText: (t: string) => void;
  setReviewDraftDish: (t: string) => void;
  setReviewDraftDishPhoto: (k: string) => void;
  postReview: () => void;
  loadSharedReviews: (placeId: string) => Promise<void>;
  // account
  hydrate: () => Promise<void>;
  createProfile: (input: { name: string; handle: string; cityId: string; color: string }) => void;
  becomeCritic: (beat: string) => void;
  stepDownCritic: () => void;
  signOut: () => void;
  connectAccount: (handle: string) => Promise<boolean>;
  signInWithGoogle: () => void;
  // language
  setLang: (lang: Lang) => void;
  // hashtag videos
  loadPlaceVideos: (placeId: string) => Promise<void>;
  openVideo: (url: string) => void;
  closeVideo: () => void;
};

/** Resolve a place by id across the seed catalog and live-loaded nearby set. */
export function resolvePlace(id: string | null, nearbyById: Record<string, Place>): Place | undefined {
  if (!id) return undefined;
  return byId[id] || nearbyById[id];
}

const initialState = (): State => ({
  tab: 'feed',
  screen: SKIP_ONBOARDING ? 'feed' : 'onboard',
  returnTo: 'feed',
  activePlaceId: null,
  obStep: 0,
  tastes: [],
  stamped: false,
  logSeg: 'been',
  tableSeg: 'events',
  ranked: RANKED0.map((r) => ({ ...r })),
  wantIds: WANT0.map((w) => w.id),
  liked: {},
  saved: {},
  follows: { rm: true, df: true, ml: false, sr: false, av: true },
  rankOpen: false,
  rankStep: 'pick',
  rankId: null,
  rankSearch: '',
  band: null,
  sub: [],
  clo: 0,
  chi: 0,
  cmpCount: 0,
  resPos: null,
  resScore: null,
  activeEventId: null,
  diet: [],
  rsvped: {},
  waitlisted: {},
  ticketId: null,
  activeThreadId: null,
  threadAdded: {},
  draft: '',
  attachOpen: false,
  clubSeat: false,
  clubReq: {},
  mapFilter: 'all',
  selPin: null,
  createdTables: [],
  createOpen: false,
  createMode: 'table',
  cPlaceId: 'lardo',
  cWhen: 'Sat 14:00',
  cSeats: 6,
  cVisibility: 'public',
  cTitle: '',
  cDesc: '',
  clubUnlocked: false,
  logoTaps: 0,
  lastTap: 0,
  clubSeg: 'events',
  userPhotos: {},
  reelIndex: 0,
  city: DEFAULT_CITY,
  nearby: [],
  nearbyById: {},
  nearbyStatus: 'idle',
  citySheetOpen: false,
  userReviews: [],
  sharedReviews: [],
  reviewLikes: {},
  reviewSort: 'popular',
  reviewFriendsOnly: false,
  reviewOpen: false,
  reviewPlaceId: null,
  reviewDraftScore: 8,
  reviewDraftText: '',
  reviewDraftDish: '',
  reviewDraftDishPhoto: DISH_PHOTOS[0],
  profile: null,
  hydrated: false,
  authUser: null,
  session: null,
  authError: null,
  lang: 'en',
  placeVideos: {},
  placeVideosStatus: {},
  videoUrl: null,
});

function findTable(s: State, id: string | null) {
  return [...s.createdTables, ...OPEN, ...EVENTS].find((t) => t.id === id);
}

function rankRow(s: State, id: string) {
  const idx = s.ranked.findIndex((r) => r.id === id);
  return idx < 0 ? null : { idx, item: s.ranked[idx] };
}

/**
 * Resolve the app profile for a signed-in Google user: reuse their existing
 * account (matched by email) or create a fresh one from their Google identity
 * with a unique handle. Always returns a usable profile, even offline.
 */
async function profileForAuthUser(user: AuthUser): Promise<Profile> {
  const existing = user.email ? await fetchProfileByEmail(user.email) : null;
  if (existing) {
    const merged: Profile = {
      ...existing,
      userId: existing.userId || user.id,
      email: existing.email || user.email,
      avatarUrl: user.avatarUrl || existing.avatarUrl,
    };
    void registerProfile(merged);
    return merged;
  }
  const handle = await uniqueHandle(handleFromEmail(user.email, user.name));
  const p = makeProfileFromAuth({
    userId: user.id,
    email: user.email,
    name: user.name,
    handle,
    avatarUrl: user.avatarUrl,
  });
  void registerProfile(p);
  return p;
}

export const useStore = create<State & Actions>((set, get) => ({
  ...initialState(),

  // ── navigation ──
  go: (tab) => set({ tab, screen: tab, activePlaceId: null }),
  setScreen: (screen) => set({ screen }),
  openPlace: (id) =>
    set((s) => ({ activePlaceId: id, screen: 'place', returnTo: s.screen === 'place' ? s.returnTo : s.screen })),
  closePlace: () => set((s) => ({ screen: s.returnTo || 'feed', activePlaceId: null })),
  openMap: () => set((s) => ({ screen: 'map', returnTo: s.screen === 'map' ? s.returnTo : s.screen, selPin: null })),
  closeMap: () => set((s) => ({ screen: s.returnTo || 'feed', selPin: null })),
  openEvent: (id) => set({ screen: 'event', activeEventId: id, diet: [] }),
  goClub: () => set({ screen: 'club' }),
  openReel: (i) => set({ screen: 'reel', reelIndex: i || 0 }),
  reelGo: (d) =>
    set((s) => {
      const n = TRENDING_VIDEOS.length;
      return { reelIndex: (s.reelIndex + d + n) % n };
    }),

  // ── onboarding ──
  obNext: () => set((s) => ({ obStep: s.obStep + 1 })),
  obSkip: () => set({ screen: 'feed' }),
  stampMe: () => {
    if (get().stamped) return;
    set({ stamped: true });
    setTimeout(() => set({ screen: 'feed', stamped: false }), 1100);
  },
  toggleTaste: (name) =>
    set((s) => ({ tastes: s.tastes.includes(name) ? s.tastes.filter((t) => t !== name) : [...s.tastes, name] })),

  // ── rank flow ──
  startRank: (id) => {
    if (id) set({ rankOpen: true, rankStep: 'bucket', rankId: id, screen: 'feed' });
    else set({ rankOpen: true, rankStep: 'pick', rankId: null, rankSearch: '' });
  },
  closeRank: () => set({ rankOpen: false }),
  setRankSearch: (q) => set({ rankSearch: q }),
  pickRank: (id) => set({ rankId: id, rankStep: 'bucket' }),
  chooseBucket: (key) => {
    const band = BANDS[key];
    const ranked = get().ranked;
    const sub: number[] = [];
    ranked.forEach((r, i) => {
      if (r.score! >= band[0] && r.score! <= band[1]) sub.push(i);
    });
    if (sub.length === 0) {
      finalize(set, get, band, [], 0);
      return;
    }
    set({ band, sub, clo: 0, chi: sub.length, cmpCount: 0, rankStep: 'compare' });
  },
  doCompare: (newWins) => {
    const { clo, chi, sub, band } = get();
    const mid = (clo + chi) >> 1;
    let nlo = clo;
    let nhi = chi;
    if (newWins) nhi = mid;
    else nlo = mid + 1;
    const count = get().cmpCount + 1;
    if (nlo >= nhi) {
      finalize(set, get, band!, sub, nlo);
      return;
    }
    set({ clo: nlo, chi: nhi, cmpCount: count });
  },
  rankAgain: () => set({ rankStep: 'pick', rankId: null, rankSearch: '', resScore: null, resPos: null }),
  seeLog: () => set({ rankOpen: false, tab: 'log', screen: 'log', logSeg: 'been', resScore: null, resPos: null }),

  // ── social ──
  toggleLike: (key) => set((s) => ({ liked: { ...s.liked, [key]: !s.liked[key] } })),
  toggleSave: (id) => set((s) => ({ saved: { ...s.saved, [id]: !s.saved[id] } })),
  toggleWant: (id) =>
    set((s) => {
      const wanted = s.wantIds.includes(id) || !!s.saved[id];
      const alreadyRanked = s.ranked.some((r) => r.id === id);
      return {
        saved: { ...s.saved, [id]: !wanted },
        wantIds: wanted
          ? s.wantIds.filter((w) => w !== id)
          : s.wantIds.includes(id) || alreadyRanked
            ? s.wantIds
            : [...s.wantIds, id],
      };
    }),
  toggleFollow: (id) => set((s) => ({ follows: { ...s.follows, [id]: !s.follows[id] } })),
  addPhoto: (id) => {
    if (!id) return;
    set((s) => {
      const cur = s.userPhotos[id] || [];
      const next = PHOTO_POOL[(cur.length + 2) % PHOTO_POOL.length];
      return { userPhotos: { ...s.userPhotos, [id]: [...cur, next] } };
    });
  },

  // ── tables / events ──
  setTableSeg: (seg) => set({ tableSeg: seg }),
  setLogSeg: (seg) => set({ logSeg: seg }),
  joinTable: (id, full) => {
    const s = get();
    if (s.rsvped[id] || s.waitlisted[id]) return;
    if (full) {
      set({ waitlisted: { ...s.waitlisted, [id]: true } });
      return;
    }
    set({ rsvped: { ...s.rsvped, [id]: true } });
  },
  rsvp: () => {
    const s = get();
    const ev = findTable(s, s.activeEventId);
    if (!ev) return;
    const left = ev.spots - ev.taken;
    if (s.rsvped[ev.id] || s.waitlisted[ev.id]) return;
    if (left <= 0) {
      set({ waitlisted: { ...s.waitlisted, [ev.id]: true } });
      return;
    }
    set({ rsvped: { ...s.rsvped, [ev.id]: true }, ticketId: ev.id, screen: 'ticket' });
  },
  openCreate: (mode = 'table') => set({ createOpen: true, createMode: mode, cTitle: '', cDesc: '' }),
  closeCreate: () => set({ createOpen: false }),
  setCreate: (patch) => set(patch as any),
  createTable: () => {
    const s = get();
    const place = byId[s.cPlaceId] || CAND[0];
    const when = WHEN_OPTS.find((w) => w.label === s.cWhen) || WHEN_OPTS[0];
    const idn = identity(s.profile);
    const opener: [string, string] = [idn.initials, idn.color];
    const isEvent = s.createMode === 'event';
    const id = (isEvent ? 'ce' : 'ct') + (s.createdTables.length + 1);
    const first = idn.name.split(' ')[0];
    const t = {
      id,
      mine: true,
      placeId: place.id,
      d: when.d,
      mo: when.mo,
      wd: when.wd,
      time: when.time,
      title: isEvent ? s.cTitle.trim() || `${place.name} — a critic's table` : place.name,
      route: isEvent ? `${place.name} · ${place.hood}` : place.hood + ' · you host',
      meet: place.name,
      host: isEvent ? `Hosted by ${first} · Critic` : 'You opened this table',
      opener,
      critic: isEvent,
      visibility: s.cVisibility,
      spots: s.cSeats,
      taken: 1,
      photo: place.photo,
      menu: isEvent
        ? [s.cDesc.trim() || 'A curated evening, guided by a verified critic.', 'Seats are limited — first come, first stamped.', `On the beat: ${idn.beat || 'CDMX dining'}`]
        : ['Order for the table', 'Split the bill, no math', 'Meet your neighbors'],
      note: isEvent
        ? s.cDesc.trim() || 'A curated event hosted by a verified CRTQ critic. Reserve a seat and come hungry.'
        : 'You opened this table. Invite friends or let the community fill the seats.',
      joined: [opener],
    };
    set((st) => ({ createdTables: [t, ...st.createdTables], createOpen: false, tableSeg: 'events' }));
  },

  // ── club (hidden) ──
  tapLogo: () => {
    const s = get();
    if (s.clubUnlocked) {
      set({ screen: 'club', clubSeg: 'events' });
      return;
    }
    const now = Date.now();
    const taps = now - s.lastTap < 1500 ? s.logoTaps + 1 : 1;
    if (taps >= 5) {
      set({ clubUnlocked: true, logoTaps: 0, lastTap: now, screen: 'club', clubSeg: 'events' });
      return;
    }
    set({ logoTaps: taps, lastTap: now });
  },
  requestClub: (id) => set((s) => ({ clubReq: { ...s.clubReq, [id]: true } })),
  setClubSeg: (seg) => set({ clubSeg: seg }),

  // ── community ──
  openThread: (id) => set({ screen: 'thread', activeThreadId: id, draft: '', attachOpen: false }),
  setDraft: (t) => set({ draft: t }),
  sendMsg: () => {
    const s = get();
    const t = s.draft.trim();
    if (!t) return;
    appendMsg(set, get, { mine: true, text: t, time: 'now' });
    set({ draft: '' });
  },
  insertApp: (app) => {
    appendMsg(set, get, { mine: true, text: app.text || '', card: app.card, time: 'now' });
    set({ attachOpen: false });
  },
  openAttach: () => set({ attachOpen: true }),
  closeAttach: () => set({ attachOpen: false }),

  // ── map / event ──
  setMapFilter: (f) => set({ mapFilter: f, selPin: null }),
  selectPin: (pin) => set({ selPin: pin }),
  toggleDiet: (name) =>
    set((s) => ({ diet: s.diet.includes(name) ? s.diet.filter((d) => d !== name) : [...s.diet, name] })),
  setVisibility: (v) => set({ cVisibility: v }),

  // ── live restaurant data ──
  loadNearby: async () => {
    const city = get().city;
    set({ nearbyStatus: 'loading' });
    try {
      const places = await getProvider().searchNearby(city);
      const map: Record<string, Place> = {};
      places.forEach((p) => (map[p.id] = p));
      set({ nearby: places, nearbyById: map, nearbyStatus: 'ready' });
    } catch {
      // Graceful degradation: keep CDMX populated from the offline sample.
      const fb = city.id === 'cdmx' ? fixtureFallback(city) : [];
      const map: Record<string, Place> = {};
      fb.forEach((p) => (map[p.id] = p));
      set({ nearby: fb, nearbyById: map, nearbyStatus: fb.length ? 'fallback' : 'error' });
    }
  },
  setCity: (id) => {
    if (get().city.id === id) {
      set({ citySheetOpen: false });
      return;
    }
    set({ city: cityById(id), selPin: null, citySheetOpen: false, nearby: [], nearbyById: {}, nearbyStatus: 'idle' });
    get().loadNearby();
  },
  openCitySheet: () => set({ citySheetOpen: true }),
  closeCitySheet: () => set({ citySheetOpen: false }),

  // ── reviews ──
  toggleReviewLike: (id) => set((s) => ({ reviewLikes: { ...s.reviewLikes, [id]: !s.reviewLikes[id] } })),
  setReviewSort: (sort) => set({ reviewSort: sort }),
  setReviewFriendsOnly: (v) => set({ reviewFriendsOnly: v }),
  openReviewComposer: (placeId) => set({ reviewOpen: true, reviewPlaceId: placeId, reviewDraftScore: 8, reviewDraftText: '', reviewDraftDish: '', reviewDraftDishPhoto: DISH_PHOTOS[0] }),
  closeReviewComposer: () => set({ reviewOpen: false }),
  setReviewDraftScore: (n) => set({ reviewDraftScore: n }),
  setReviewDraftText: (t) => set({ reviewDraftText: t }),
  setReviewDraftDish: (t) => set({ reviewDraftDish: t }),
  setReviewDraftDishPhoto: (k) => set({ reviewDraftDishPhoto: k }),
  postReview: () => {
    const s = get();
    const placeId = s.reviewPlaceId;
    if (!placeId) return;
    const text = s.reviewDraftText.trim();
    const dish = s.reviewDraftDish.trim();
    const idn = identity(s.profile);
    const rev: Review = {
      id: 'ur-' + (s.userReviews.length + 1) + '-' + Date.now().toString(36),
      placeId,
      authorId: 'me',
      author: `You · ${idn.name.split(' ')[0]}`,
      initials: idn.initials,
      color: idn.color,
      score: s.reviewDraftScore,
      text: text || 'Logged it.',
      date: 'now',
      baseLikes: 0,
      friend: false,
      ...(idn.role === 'critic' ? { critic: true } : {}),
      ...(dish ? { dish, dishPhoto: s.reviewDraftDishPhoto } : {}),
    };
    set({ userReviews: [rev, ...s.userReviews], reviewOpen: false, reviewDraftText: '', reviewDraftDish: '' });
    // Publish to the shared backend so other testers see it (no-op if disabled).
    void pushSharedReview(rev);
  },
  loadSharedReviews: async (placeId) => {
    const incoming = await fetchSharedReviews(placeId);
    if (!incoming.length) return;
    set((s) => {
      const have = new Set(s.sharedReviews.map((r) => r.id));
      const add = incoming.filter((r) => !have.has(r.id));
      return add.length ? { sharedReviews: [...add, ...s.sharedReviews] } : {};
    });
  },

  // ── account (local profile) ──
  hydrate: async () => {
    const lang = await loadLang();
    if (lang) set({ lang });

    // 1) Returning from a Google sign-in? Implicit-flow tokens arrive in the URL hash.
    const redirect = consumeAuthRedirect();
    if (redirect.error) set({ authError: redirect.error });
    let session: Session | null = redirect.session || null;

    // 2) Otherwise restore a stored session (refresh it if it has expired).
    if (!session) {
      const stored = await loadSession();
      if (stored) {
        session = stored.expires_at > Date.now() + 60_000 ? stored : await refreshSession(stored.refresh_token);
      }
    }

    // 3) With a valid session, resolve the Google user + their app profile.
    if (session) {
      const user = await fetchAuthUser(session.access_token);
      if (user && user.id) {
        const full: Session = { ...session, user };
        await saveSession(full);
        const prof = await profileForAuthUser(user);
        saveProfile(prof);
        set({
          authUser: user,
          session: full,
          profile: prof,
          city: cityById(prof.cityId),
          screen: 'feed',
          nearbyStatus: 'idle',
          hydrated: true,
        });
        return;
      }
      // Token no longer valid — drop it and fall through to local/guest.
      await clearSession();
    }

    // 4) No auth session: fall back to the local (handle-based) profile as before.
    const p = await loadProfile();
    if (p) set({ profile: p, city: cityById(p.cityId), screen: 'feed', nearbyStatus: 'idle' });
    else set({ screen: SKIP_ONBOARDING ? 'feed' : 'onboard' });
    set({ hydrated: true });
  },
  createProfile: (input) => {
    const p = makeProfile(input);
    saveProfile(p);
    // Register the username in the central directory (no-op if backend off).
    void registerProfile(p);
    set({ profile: p, city: cityById(p.cityId), nearby: [], nearbyById: {}, nearbyStatus: 'idle' });
  },
  becomeCritic: (beat) => {
    const s = get();
    if (!s.profile) return;
    // Stable seeded audience for the pilot (real critics carry their platform following).
    const seeded = 900 + (s.profile.passportNo % 40) * 63;
    const p: Profile = { ...s.profile, role: 'critic', beat, followers: s.profile.followers ?? seeded };
    saveProfile(p);
    void registerProfile(p);
    set({ profile: p });
  },
  stepDownCritic: () => {
    const s = get();
    if (!s.profile) return;
    const p: Profile = { ...s.profile, role: 'nomad' };
    saveProfile(p);
    void registerProfile(p);
    set({ profile: p });
  },
  signOut: () => {
    const s = get();
    if (s.session) void signOutRemote(s.session.access_token);
    clearProfile();
    clearSession();
    set({ profile: null, authUser: null, session: null, authError: null, screen: 'onboard', obStep: 0, tastes: [], stamped: false });
  },
  signInWithGoogle: () => {
    set({ authError: null });
    authSignInWithGoogle(); // navigates the browser to Google (web); no-op on native
  },
  connectAccount: async (handle) => {
    const found = await fetchProfileByHandle(handle);
    if (!found) return false;
    saveProfile(found);
    set({
      profile: found,
      city: cityById(found.cityId),
      screen: 'feed',
      obStep: 0,
      nearby: [],
      nearbyById: {},
      nearbyStatus: 'idle',
    });
    return true;
  },

  // ── language ──
  setLang: (lang) => {
    saveLang(lang);
    set({ lang });
  },

  // ── hashtag videos ──
  loadPlaceVideos: async (placeId) => {
    const s = get();
    const status = s.placeVideosStatus[placeId];
    // Fetch once per place per session (ready/empty are terminal; loading in-flight).
    if (status === 'loading' || status === 'ready') return;
    const place = resolvePlace(placeId, s.nearbyById);
    if (!place) return;
    set({ placeVideosStatus: { ...s.placeVideosStatus, [placeId]: 'loading' } });
    let vids: TrendingVideo[] = [];
    try {
      vids = await searchPlaceVideos(place, get().city);
    } catch {
      vids = [];
    }
    set((st) => ({
      placeVideos: { ...st.placeVideos, [placeId]: vids },
      placeVideosStatus: { ...st.placeVideosStatus, [placeId]: vids.length ? 'ready' : 'empty' },
    }));
  },
  openVideo: (url) => set({ videoUrl: url }),
  closeVideo: () => set({ videoUrl: null }),
}));

// ── rank-engine internals (kept outside the object to share set/get) ──
function finalize(
  set: (partial: Partial<State>) => void,
  get: () => State,
  band: [number, number],
  sub: number[],
  subPos: number,
) {
  const ranked = get().ranked.slice();
  let idx: number;
  if (sub.length === 0) idx = ranked.filter((r) => r.score! > band[1]).length;
  else idx = subPos < sub.length ? sub[subPos] : sub[sub.length - 1] + 1;
  const aboveScore = idx > 0 ? ranked[idx - 1].score! : band[1];
  const belowScore = idx < ranked.length ? ranked[idx].score! : band[0];
  const upper = Math.min(band[1], aboveScore);
  const lower = Math.max(band[0], belowScore);
  let score = Math.round(((upper + lower) / 2) * 10) / 10;
  if (score >= aboveScore) score = Math.round((aboveScore - 0.1) * 10) / 10;
  if (score <= belowScore) score = Math.round((belowScore + 0.1) * 10) / 10;
  if (score > 10) score = 10;
  if (score < 3) score = 3;
  const s = get();
  const base = resolvePlace(s.rankId, s.nearbyById);
  if (!base) return;
  const placed = { ...base, score };
  ranked.splice(idx, 0, placed);
  set({
    ranked,
    wantIds: s.wantIds.filter((w) => w !== s.rankId),
    resPos: idx,
    resScore: score,
    rankStep: 'result',
  });
}

function appendMsg(set: (partial: Partial<State>) => void, get: () => State, msg: any) {
  const id = get().activeThreadId;
  if (!id) return;
  const s = get();
  set({ threadAdded: { ...s.threadAdded, [id]: [...(s.threadAdded[id] || []), msg] } });
}

export { findTable, rankRow };
