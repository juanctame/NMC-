/**
 * Single application store (Zustand). Mirrors the prototype's `this.state` and
 * its methods. Per-screen view-models are derived inside the screen components
 * from this state plus the static data in ./data.
 */
import { emptyTopFour, loadTopFour, saveTopFour, type TopFour, type TopPick } from '../data/favorites';
import { freshDecide, forToday, loadDecide, saveDecide, type DecideState, type DecideAction } from '../data/decide';
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
  TRENDING,
  type Place,
} from './data';
import { PHOTO_POOL } from '../assets';
import { DEFAULT_CITY, cityById, type City } from '../data/cities';
import { getProvider, fixtureFallback } from '../data/provider';
import { fetchCachedPlaces } from '../data/placesCache';
import type { PlaceDetails, DetailsStatus, LivePhoto } from '../data/placeDetails';
import { pickFoodPhotos, photoImportSupported } from '../data/photoImport';
import {
  resolveVenuePhoto,
  resolveChefPhoto,
  resolveDishPhoto,
  resolveCommonsNamed,
  resolveNearbyPhotos,
  resolveHoodPhoto,
  dishTerm,
  type WikiImgResolved,
} from '../data/wikiPhotos';
import type { PhotoMatch, PhotoImportStatus, PhotoPoint } from '../data/photoImportTypes';
import { CARTE_CDMX } from '../data/carte';
import { houseMapPlaces } from '../data/houseCritics';
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
  loadTrendingCache,
  saveTrendingCache,
  loadChannelPosts,
  saveChannelPosts,
} from '../data/storage';
import {
  registerProfile,
  fetchProfileByHandle,
  fetchMyProfile,
  ownerOfHandle,
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
import { type TrendingVideo, type VideoMeta } from '../data/videos';
import * as cloud from '../data/cloud';
import type { ImportSource } from '../data/importers';
import { loadMine, saveMine } from '../data/mine';
import { loadAllSpots, spotToPlace } from '../data/spots';
import { gridOf, nearestPlace, findVisits, type PhotoObs } from '../data/visits';
import { scanFood, foodScanSupported, type FoodScore } from '../data/foodScan';
import { categoryOf } from '../data/favorites';
import { searchPlaceVideos } from '../data/videosLive';
import { computeMonthlyTrending } from '../data/trendingLive';
import type { BuzzResult } from '../data/trending';
import { channelForm, SEED_CHANNEL_POSTS, type ChannelPost } from '../data/channels';
import type { Lang } from '../i18n';

export type NearbyStatus = 'idle' | 'loading' | 'cached' | 'ready' | 'fallback' | 'error';
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
  | 'channel'
  | 'foodie'
  | 'chef'
  | 'group'
  | 'critic'
  | 'decide'
  | 'clips'
  | 'map'
  | 'reel';

/** Profile screens (place / chef / group) share one back-trail. */
const PROFILE_SCREENS: Screen[] = ['place', 'chef', 'group', 'critic'];
type NavSnap = { screen: Screen; activePlaceId: string | null; activeChefId: string | null; activeGroupId: string | null; activeCriticId: string | null; activeFoodieId?: string | null; foodieReturn?: Screen };

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
  clubSeg: 'events' | 'community' | 'code';

  userPhotos: Record<string, string[]>;
  reelIndex: number;

  // Live restaurant data (per selected city)
  city: City;
  nearby: Place[];
  nearbyById: Record<string, Place>;
  nearbyStatus: NearbyStatus;
  nearbyUpdatedAt: string | null; // when the shared cache was last swept (only set on 'cached')
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
  // Trial backend: is this person's data on the server, and when it last synced
  cloud: cloud.CloudState;
  cloudNote: string;
  syncedAt: number | null;

  // Language (flag-picked i18n)
  lang: Lang;

  // Hashtag videos: real clips per place (YouTube), + the embed playing now
  placeVideos: Record<string, TrendingVideo[]>;
  placeVideosStatus: Record<string, VideoStatus>;
  videoUrl: string | null;
  videoMeta: VideoMeta | null; // credits for the clip playing in-app

  // Rich "before you go" details per place (live Google Place Details)
  placeDetails: Record<string, PlaceDetails>;
  placeDetailsStatus: Record<string, DetailsStatus>;
  // Real Google Maps photos resolved for curated venues (live, attributed)
  livePhotos: Record<string, LivePhoto>;
  // Real freely-licensed photos from Wikipedia/Wikimedia (keyless, attributed)
  venuePhotos: Record<string, WikiImgResolved>; // placeId → real venue photo
  chefPhotos: Record<string, WikiImgResolved>; // chefId → chef portrait
  platePhotos: Record<string, { dish: string; img: WikiImgResolved }[]>; // placeId → reference plates
  commonsPhotos: Record<string, WikiImgResolved[]>; // placeId → Commons files named after the venue
  nearbyPhotos: Record<string, WikiImgResolved[]>; // placeId → photos geotagged around the corner
  hoodPhotos: Record<string, WikiImgResolved>; // neighbourhood → its photo (shared)

  // Chef profiles (guide credits; same chef across venues links into one)
  activeChefId: string | null;
  activeCriticId: string | null;
  /** "Can't decide?" deck: today's swipes, today's pick, and where it was opened from. */
  decide: DecideState;
  decideReturn: Screen;
  /** The four restaurants featured on your profile (slots may be empty). */
  topFour: TopFour;
  /** Open Top 4 picker: which slot is being filled and/or which place is being featured. */
  topPicker: { slot: number | null; placeId: string | null } | null;
  foodieReturn: Screen;
  /** A passport page to open the You tab on (e.g. 'data' from "You" in a fan list). */
  passportAt: string | null;
  // Restaurant groups (venues the guide ties together)
  activeGroupId: string | null;
  // Back-trail across profile screens: where the trail began + each step since.
  profileReturnTo: Screen;
  profileStack: NavSnap[];

  // Clips (TikTok-style feed): which restaurant leads, and where to return to.
  clipsFocusId: string | null;
  clipsStartId: string | null; // open the feed at this clip
  clipsReturn: (NavSnap & { profileReturnTo: Screen; profileStack: NavSnap[] }) | null;

  // "Build your passport from photos" — import flow state
  photoImportOpen: boolean;
  importOpen: boolean;
  importCounts: Record<string, number>; // places brought in, by source (this session)
  importSource: ImportSource | null;
  photoImportStatus: PhotoImportStatus;
  photoProgress: string;
  photoMatches: PhotoMatch[];
  photoScanned: number; // how many photos were read in the last run
  photoAdded: number; // how many places the last import registered

  // Monthly trending: restaurants ranked by last-30d social buzz (YouTube)
  monthlyTrending: BuzzResult[];
  monthlyTrendingStatus: VideoStatus;

  // Club channels (structured chats). User posts merge over the seed.
  activeChannel: string | null;
  channelUserPosts: Record<string, ChannelPost[]>;
  channelComposerOpen: boolean;
  channelDraftKind: string;
  channelDraft: Record<string, string>;

  // Taste identity: viewing another foodie, and the shareable taste card.
  activeFoodieId: string | null;
  tasteCardOpen: boolean;
};

export type Actions = {
  // navigation
  go: (tab: State['tab']) => void;
  setScreen: (screen: Screen) => void;
  openPlace: (id: string) => void;
  closePlace: () => void;
  openChef: (id: string) => void;
  closeChef: () => void;
  openCritic: (id: string) => void;
  openDecide: () => void;
  loadTopFourState: () => Promise<void>;
  setTopSlot: (slot: number, pick: TopPick | null) => void;
  openTopPicker: (slot?: number | null, placeId?: string | null) => void;
  closeTopPicker: () => void;
  closeDecide: () => void;
  loadDecideState: () => Promise<void>;
  decideAct: (id: string, action: DecideAction) => void;
  decideUndo: () => void;
  decideReshuffle: () => void;
  closeCritic: () => void;
  openGroup: (id: string) => void;
  closeGroup: () => void;
  openClips: (focusPlaceId?: string | null, startClipId?: string | null) => void;
  closeClips: () => void;
  ensureVenuePhoto: (place: Place) => Promise<void>;
  ensureChefPhoto: (chef: { id: string; name: string }) => Promise<void>;
  ensurePlates: (place: Place) => Promise<void>;
  ensureMedia: (place: Place) => Promise<void>;
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
  setBio: (text: string) => void;
  signOut: () => void;
  connectAccount: (handle: string) => Promise<boolean | 'google'>;
  syncNow: () => Promise<void>;
  prepareSync: () => Promise<void>;
  signInWithGoogle: () => void;
  // language
  setLang: (lang: Lang) => void;
  // hashtag videos
  loadPlaceVideos: (placeId: string) => Promise<void>;
  // rich place details
  loadPlaceDetails: (placeId: string) => Promise<void>;
  // build-from-photos import
  openPhotoImport: () => void;
  openImport: (source?: ImportSource | null) => void;
  closeImport: () => void;
  applyImport: (items: { place: Place; list: 'been' | 'want'; score?: number }[]) => { been: number; want: number };
  closePhotoImport: () => void;
  runPhotoImport: () => Promise<void>;
  togglePhotoMatch: (id: string) => void;
  swapPhotoMatch: (id: string) => void;
  confirmPhotoMatches: () => void;
  openVideo: (url: string, meta?: VideoMeta) => void;
  closeVideo: () => void;
  // monthly trending
  loadMonthlyTrending: (force?: boolean) => Promise<void>;
  // club channels
  openChannel: (tag: string) => void;
  openChannelComposer: () => void;
  closeChannelComposer: () => void;
  setChannelDraftKind: (kind: string) => void;
  setChannelDraftField: (key: string, value: string) => void;
  postToChannel: () => void;
  // taste identity
  openFoodie: (id: string) => void;
  closeFoodie: () => void;
  openMyProfile: () => void;
  openTasteCard: () => void;
  closeTasteCard: () => void;
};

/** Resolve a place by id across the seed catalog and live-loaded nearby set. */
/**
 * Places the user has registered into their log (e.g. from photo import) that
 * must stay resolvable even after a city reload replaces `nearbyById`. Kept in a
 * module registry so detail/rank views can always open them.
 */
const registeredPlaces: Record<string, Place> = {};

/** Entities we've already attempted a Wikipedia/Wikimedia lookup for (fetch once). */
const wikiTried = new Set<string>();

/** Make places from outside the guide (e.g. discovered spots) openable anywhere. */
export function registerPlaces(ps: Place[]): void {
  ps.forEach((p) => (registeredPlaces[p.id] = registeredPlaces[p.id] || p));
}

// House critics' map places open from anywhere (their page, search, a friend's list).
registerPlaces(houseMapPlaces());

export function resolvePlace(id: string | null, nearbyById: Record<string, Place>): Place | undefined {
  if (!id) return undefined;
  return byId[id] || nearbyById[id] || registeredPlaces[id];
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
  nearbyUpdatedAt: null,
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
  cloud: cloud.cloudConfigured() ? 'connecting' : 'off',
  cloudNote: '',
  syncedAt: null,
  authError: null,
  lang: 'en',
  placeVideos: {},
  placeVideosStatus: {},
  placeDetails: {},
  placeDetailsStatus: {},
  livePhotos: {},
  venuePhotos: {},
  chefPhotos: {},
  platePhotos: {},
  commonsPhotos: {},
  nearbyPhotos: {},
  hoodPhotos: {},
  activeChefId: null,
  activeCriticId: null,
  decide: freshDecide(),
  decideReturn: 'feed',
  topFour: emptyTopFour(),
  foodieReturn: 'board',
  passportAt: null,
  topPicker: null,
  activeGroupId: null,
  profileReturnTo: 'feed',
  profileStack: [],
  clipsFocusId: null,
  clipsStartId: null,
  clipsReturn: null,
  photoImportOpen: false,
  importOpen: false,
  importCounts: {},
  importSource: null,
  photoImportStatus: 'idle',
  photoProgress: '',
  photoMatches: [],
  photoScanned: 0,
  photoAdded: 0,
  videoUrl: null,
  videoMeta: null,
  monthlyTrending: [],
  monthlyTrendingStatus: 'idle',
  activeChannel: null,
  channelUserPosts: {},
  channelComposerOpen: false,
  channelDraftKind: '',
  channelDraft: {},
  activeFoodieId: null,
  tasteCardOpen: false,
});

/**
 * Open a profile screen (place / chef / group). Coming from another profile we
 * remember where we were, so Back retraces the exact path (place → chef → place
 * → Back → chef → Back → place); from anywhere else a fresh trail starts. Kept
 * separate from the map's `returnTo` so map → place → Back → Back still exits.
 */
function openProfile(
  s: State,
  screen: 'place' | 'chef' | 'group' | 'critic',
  ids: Partial<Pick<State, 'activePlaceId' | 'activeChefId' | 'activeGroupId' | 'activeCriticId'>>,
): Partial<State> {
  const key = ({ place: 'activePlaceId', chef: 'activeChefId', group: 'activeGroupId', critic: 'activeCriticId' } as const)[screen];
  if (s.screen === screen && s[key] === ids[key]) return {}; // already here
  // A foodie's profile joins the trail too, so Back from a chef or place opened there returns to them.
  if (PROFILE_SCREENS.includes(s.screen) || s.screen === 'foodie') {
    const snap: NavSnap = { screen: s.screen, activePlaceId: s.activePlaceId, activeChefId: s.activeChefId, activeGroupId: s.activeGroupId, activeCriticId: s.activeCriticId, activeFoodieId: s.activeFoodieId, foodieReturn: s.foodieReturn };
    return { ...ids, screen, profileStack: [...s.profileStack, snap] };
  }
  return { ...ids, screen, profileStack: [], profileReturnTo: s.screen };
}

/** Back from a profile screen: retrace the trail, else return to where it began. */
function closeProfile(s: State): Partial<State> {
  const prev = s.profileStack[s.profileStack.length - 1];
  if (prev) {
    const { activeFoodieId, foodieReturn, ...rest } = prev;
    return { ...rest, ...(prev.screen === 'foodie' ? { activeFoodieId: activeFoodieId ?? null, foodieReturn: foodieReturn || 'board' } : {}), profileStack: s.profileStack.slice(0, -1) };
  }
  return { screen: s.profileReturnTo || 'feed', activePlaceId: null, profileStack: [] };
}

function findTable(s: State, id: string | null) {
  return [...s.createdTables, ...OPEN, ...EVENTS].find((t) => t.id === id);
}

function rankRow(s: State, id: string) {
  const idx = s.ranked.findIndex((r) => r.id === id);
  return idx < 0 ? null : { idx, item: s.ranked[idx] };
}

/**
 * Resolve the passport for a signed-in user: their own on the server (by user,
 * or — first Google sign-in — a pilot passport registered with that email),
 * else the one on this device (a device account that hasn't synced yet), else
 * — for Google — a fresh one from their identity with a unique handle. Null
 * means "make a passport" (onboarding).
 */
async function profileForAuthUser(user: AuthUser, local: Profile | null): Promise<Profile | null> {
  const existing = await fetchMyProfile();
  if (existing) {
    return {
      ...existing,
      userId: user.id,
      email: user.email || existing.email,
      avatarUrl: user.avatarUrl || existing.avatarUrl,
    };
  }
  if (local) return { ...local, userId: user.id, ...(user.email ? { email: user.email } : {}), ...(user.avatarUrl && !local.avatarUrl ? { avatarUrl: user.avatarUrl } : {}) };
  if (user.anonymous) return null;
  const handle = await uniqueHandle(handleFromEmail(user.email, user.name));
  return makeProfileFromAuth({ userId: user.id, email: user.email, name: user.name, handle, avatarUrl: user.avatarUrl });
}

// ── your data: on the device, and on the server ─────────────────────────────

/** Persistence + sync only run once a passport's data has been loaded (never for the preview). */
let mineOwner: string | null = null;
/** Want-to-try places brought in by an import (kept when a new passport starts). */
const importedWants = new Set<string>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** A ranked place known only by id + name (from another device): enough to list it. */
function placeFromRow(r: cloud.RankRow): Place {
  let h = 0;
  for (const c of r.place_id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {
    id: r.place_id,
    name: r.place_name || r.place_id,
    cuisine: '',
    hood: '',
    price: '',
    photo: PHOTO_POOL[h % PHOTO_POOL.length],
    addr: '',
    blurb: '',
    openInfo: '',
    ...(r.score != null ? { score: Number(r.score) } : {}),
  };
}

/** Merge what the server holds into what's on the device (union; the device wins a tie). */
function mergeMine(get: () => State, set: (p: Partial<State>) => void, remote: { rankings: cloud.RankRow[]; wants: string[]; follows: string[] }): void {
  const s = get();
  const have = new Set(s.ranked.map((p) => p.id));
  const fromServer = remote.rankings
    .filter((r) => !have.has(r.place_id))
    .map((r) => {
      const known = resolvePlace(r.place_id, s.nearbyById);
      const p = known ? { ...known, score: r.score != null ? Number(r.score) : known.score } : placeFromRow(r);
      registeredPlaces[p.id] = p;
      return { p, pos: r.position ?? 999 };
    });
  const ranked = s.ranked.length
    ? [...s.ranked, ...fromServer.map((x) => x.p)].sort((a, b) => (b.score || 0) - (a.score || 0))
    : fromServer.sort((a, b) => a.pos - b.pos).map((x) => x.p);
  const wantIds = [...new Set([...s.wantIds, ...remote.wants])].filter((id) => !ranked.some((p) => p.id === id));
  const follows = { ...s.follows };
  remote.follows.forEach((k) => (follows[k] = true));
  set({ ranked, wantIds, follows });
}

/**
 * Open a passport's data: what's on the device first (instantly), then the
 * server — signing this device in as a real user if it isn't yet, registering
 * the passport, merging their data from other devices and sending up anything
 * only this device had. `fresh` = a brand-new passport (starts empty).
 */
async function startAccount(set: (p: Partial<State>) => void, get: () => State, opts: { fresh?: boolean } = {}): Promise<void> {
  let p = get().profile;
  if (!p) return;
  const local = opts.fresh ? null : await loadMine(p.handle);
  if (local) {
    local.ranked.forEach((x) => (registeredPlaces[x.id] = x));
    set({ ranked: local.ranked, wantIds: local.wantIds, saved: local.saved, follows: local.follows, userReviews: local.userReviews });
  } else if (opts.fresh || mineOwner !== p.handle) {
    // A real passport starts empty — the demo list is only for the preview — except
    // for what they brought in while making it (photos, Beli, Google Maps, notes).
    const s0 = get();
    const ranked = opts.fresh ? s0.ranked.filter((x) => x.provisional || x.importedFrom) : [];
    const wantIds = opts.fresh ? s0.wantIds.filter((id) => importedWants.has(id)) : [];
    set({ ranked, wantIds, saved: Object.fromEntries(wantIds.map((id) => [id, true])), follows: {}, userReviews: [] });
  }
  mineOwner = p.handle;
  void persistMine(get);

  if (!cloud.cloudConfigured()) return;
  set({ cloud: 'connecting', cloudNote: '' });
  let sess = cloud.currentSession();
  if (!sess) {
    sess = await cloud.signInAnonymously();
    if (sess) {
      cloud.setSession(sess);
      set({ session: sess, authUser: sess.user });
    }
  }
  if (!sess) {
    const st = cloud.cloudState();
    set({ cloud: st.state === 'connecting' ? 'local' : st.state, cloudNote: st.note });
    return;
  }
  // The passport on the server: keep the handle unique (someone else may own it).
  if (!(await registerProfile(p))) {
    const owner = await ownerOfHandle(p.handle);
    if (owner && owner !== sess.user.id) {
      const handle = await uniqueHandle(p.handle);
      const moved: Profile = { ...p, handle };
      const m = await loadMine(p.handle);
      if (m) await saveMine(handle, m);
      p = moved;
      mineOwner = handle;
      saveProfile(moved);
      set({ profile: moved });
      await registerProfile(moved);
    }
  }
  const remote = await cloud.pullMine();
  if (!remote) {
    set({ cloud: 'offline', cloudNote: 'Saved on this device — it will sync when the server answers.' });
    return;
  }
  cloud.markSynced(remote);
  mergeMine(get, set, remote);
  const ok = await pushNow(get);
  void cloud.touchSession();
  set({ cloud: ok ? 'synced' : 'offline', cloudNote: ok ? '' : 'Some changes are waiting to sync.', syncedAt: ok ? Date.now() : get().syncedAt });
}

async function persistMine(get: () => State): Promise<void> {
  const s = get();
  if (!s.profile || mineOwner !== s.profile.handle) return;
  await saveMine(s.profile.handle, { ranked: s.ranked, wantIds: s.wantIds, saved: s.saved, follows: s.follows, userReviews: s.userReviews });
}

async function pushNow(get: () => State): Promise<boolean> {
  const s = get();
  if (!s.profile || mineOwner !== s.profile.handle || !cloud.currentSession()) return false;
  return cloud.pushMine({ ranked: s.ranked, wantIds: s.wantIds, follows: Object.keys(s.follows).filter((k) => s.follows[k]) }, (p) => categoryOf(p));
}

let decideLoaded = false;
let topFourLoaded = false;

export const useStore = create<State & Actions>((set, get) => ({
  ...initialState(),

  // ── navigation ──
  go: (tab) => set({ tab, screen: tab, activePlaceId: null, profileStack: [] }),
  setScreen: (screen) => set({ screen }),
  openPlace: (id) => set((s) => openProfile(s, 'place', { activePlaceId: id })),
  closePlace: () => set((s) => closeProfile(s)),
  openChef: (id) => set((s) => openProfile(s, 'chef', { activeChefId: id })),
  closeChef: () => set((s) => closeProfile(s)),
  openCritic: (id) => set((s) => openProfile(s, 'critic', { activeCriticId: id })),
  closeCritic: () => set((s) => closeProfile(s)),
  loadTopFourState: async () => {
    if (topFourLoaded) return;
    topFourLoaded = true;
    const t = await loadTopFour();
    if (get().topFour.every((x) => !x)) set({ topFour: t });
  },
  setTopSlot: (slot, pick) => {
    const cur = get().topFour.slice() as TopFour;
    // A restaurant appears once: featuring it in a new slot moves it there.
    if (pick) cur.forEach((t, i) => t?.placeId === pick.placeId && i !== slot && (cur[i] = null));
    cur[slot] = pick;
    set({ topFour: cur });
    void saveTopFour(cur);
  },
  openTopPicker: (slot = null, placeId = null) => set({ topPicker: { slot, placeId } }),
  closeTopPicker: () => set({ topPicker: null }),
  openDecide: () => set((s) => ({ screen: 'decide', decideReturn: s.screen === 'decide' ? s.decideReturn : s.screen, decide: forToday(s.decide) })),
  closeDecide: () => set((s) => ({ screen: s.decideReturn || 'feed' })),
  loadDecideState: async () => {
    if (decideLoaded) return; // once per session: later, the in-memory deck is the truth
    decideLoaded = true;
    const d = await loadDecide();
    // Swipes made while it loaded win over the stored copy.
    if (!get().decide.history.length) set({ decide: d });
  },
  decideAct: (id, action) => {
    const s = get();
    const d = forToday(s.decide);
    // "Maybe" saves it to want-to-try (remembering whether we added it, for undo).
    const addedWant = action === 'later' && !s.wantIds.includes(id) && !s.ranked.some((r) => r.id === id);
    const next: DecideState = {
      ...d,
      seen: d.seen.includes(id) ? d.seen : [...d.seen, id],
      pick: action === 'go' ? id : d.pick,
      history: [...d.history, { id, action, addedWant }].slice(-50),
    };
    set({
      decide: next,
      ...(addedWant ? { wantIds: [...s.wantIds, id], saved: { ...s.saved, [id]: true } } : null),
    });
    void saveDecide(next);
  },
  decideUndo: () => {
    const s = get();
    const d = forToday(s.decide);
    const last = d.history[d.history.length - 1];
    if (!last) return;
    const prevGo = [...d.history.slice(0, -1)].reverse().find((h) => h.action === 'go');
    const next: DecideState = {
      ...d,
      seen: d.seen.filter((x) => x !== last.id),
      pick: last.action === 'go' && d.pick === last.id ? (prevGo?.id ?? null) : d.pick,
      history: d.history.slice(0, -1),
    };
    set({
      decide: next,
      ...(last.addedWant ? { wantIds: s.wantIds.filter((w) => w !== last.id), saved: { ...s.saved, [last.id]: false } } : null),
    });
    void saveDecide(next);
  },
  decideReshuffle: () => {
    const d = forToday(get().decide);
    const next: DecideState = { ...d, seen: d.pick ? [d.pick] : [], history: [] };
    set({ decide: next });
    void saveDecide(next);
  },
  openGroup: (id) => set((s) => openProfile(s, 'group', { activeGroupId: id })),
  closeGroup: () => set((s) => closeProfile(s)),
  // Clips remembers the whole navigation state it was opened from, so Back
  // returns exactly there (even after hopping into restaurants from the feed).
  openClips: (focusPlaceId, startClipId) =>
    set((s) => ({
      screen: 'clips',
      clipsFocusId: focusPlaceId || null,
      clipsStartId: startClipId || null,
      clipsReturn:
        s.screen === 'clips'
          ? s.clipsReturn
          : {
              screen: s.screen,
              activePlaceId: s.activePlaceId,
              activeChefId: s.activeChefId,
              activeGroupId: s.activeGroupId,
              activeCriticId: s.activeCriticId,
              profileReturnTo: s.profileReturnTo,
              profileStack: s.profileStack,
            },
    })),
  closeClips: () => set((s) => (s.clipsReturn ? { ...s.clipsReturn, clipsReturn: null } : { screen: 'feed', clipsReturn: null })),
  // Real freely-licensed photos (Wikipedia/Wikimedia), resolved on demand and
  // cached; each only fills in if a match is actually found (else the generated
  // cover stays). Never blocks the UI.
  ensureVenuePhoto: async (place) => {
    if (!place || place.photoUrl) return; // already has a real (Google) photo
    const k = 'v:' + place.id;
    if (wikiTried.has(k)) return;
    wikiTried.add(k);
    const img = await resolveVenuePhoto(place.name);
    if (img) set((s) => ({ venuePhotos: { ...s.venuePhotos, [place.id]: img } }));
  },
  ensureChefPhoto: async (chef) => {
    if (!chef) return;
    const k = 'c:' + chef.id;
    if (wikiTried.has(k)) return;
    wikiTried.add(k);
    const img = await resolveChefPhoto(chef.name);
    if (img) set((s) => ({ chefPhotos: { ...s.chefPhotos, [chef.id]: img } }));
  },
  ensurePlates: async (place) => {
    if (!place || !place.dishes || !place.dishes.length) return;
    const k = 'p:' + place.id;
    if (wikiTried.has(k)) return;
    wikiTried.add(k);
    const seen = new Set<string>();
    const out: { dish: string; img: WikiImgResolved }[] = [];
    for (const dish of place.dishes.slice(0, 5)) {
      const term = dishTerm(dish);
      if (!term || seen.has(term)) continue;
      seen.add(term);
      const img = await resolveDishPhoto(term);
      if (img) out.push({ dish, img });
      if (out.length >= 4) break;
    }
    if (out.length) set((s) => ({ platePhotos: { ...s.platePhotos, [place.id]: out } }));
  },
  // Every freely-licensed picture we can find for a venue (its Wikipedia photo,
  // Commons files named after it, photos taken around the corner, and its
  // neighbourhood) — so each restaurant has a real visual presence. Fetched once.
  ensureMedia: async (place) => {
    if (!place) return;
    const k = 'm:' + place.id;
    if (wikiTried.has(k)) return;
    wikiTried.add(k);
    get().ensureVenuePhoto(place);
    const hood = place.hood;
    const tasks: Promise<void>[] = [
      resolveCommonsNamed(place.name).then((imgs) => {
        if (imgs.length) set((s) => ({ commonsPhotos: { ...s.commonsPhotos, [place.id]: imgs } }));
      }),
    ];
    if (place.lat != null && place.lon != null) {
      tasks.push(
        resolveNearbyPhotos(place.lat, place.lon).then((imgs) => {
          if (imgs.length) set((s) => ({ nearbyPhotos: { ...s.nearbyPhotos, [place.id]: imgs } }));
        }),
      );
    }
    if (hood && !get().hoodPhotos[hood]) {
      tasks.push(
        resolveHoodPhoto(hood, place.borough).then((img) => {
          if (img) set((s) => ({ hoodPhotos: { ...s.hoodPhotos, [hood]: img } }));
        }),
      );
    }
    await Promise.all(tasks.map((t) => t.catch(() => undefined)));
  },
  openMap: () => set((s) => ({ screen: 'map', returnTo: s.screen === 'map' ? s.returnTo : s.screen, selPin: null })),
  closeMap: () => set((s) => ({ screen: s.returnTo || 'feed', selPin: null })),
  openEvent: (id) => set({ screen: 'event', activeEventId: id, diet: [] }),
  goClub: () => set({ screen: 'club' }),
  openReel: (i) => set({ screen: 'reel', reelIndex: i || 0 }),
  reelGo: (d) =>
    set((s) => {
      const n = Math.max(1, s.monthlyTrending.length);
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
    // 0) CDMX ships with a curated, up-to-date guide dataset (Michelin 2026 / 50
    //    Best / DENUE) — use it directly so the demo is full, real, and rich
    //    (real dishes, chefs, prices, awards) without any API or cache.
    if (city.id === 'cdmx') {
      const map: Record<string, Place> = {};
      CARTE_CDMX.forEach((p) => (map[p.id] = p));
      set({ nearby: CARTE_CDMX, nearbyById: map, nearbyStatus: 'ready', nearbyUpdatedAt: null });
      return;
    }
    // 1) Cache-first: read the shared, pre-swept city index (Supabase). Every
    //    visitor reads this one table, so nobody spends Google quota on load.
    try {
      const { places: cached, updatedAt } = await fetchCachedPlaces(city.id);
      if (get().city.id !== city.id) return; // city changed mid-read — drop stale
      if (cached.length) {
        const map: Record<string, Place> = {};
        cached.forEach((p) => (map[p.id] = p));
        set({ nearby: cached, nearbyById: map, nearbyStatus: 'cached', nearbyUpdatedAt: updatedAt });
        return;
      }
    } catch {
      // Cache unreachable — fall through to the live sweep below.
    }
    // 2) No cache (unconfigured/empty/offline): sweep Google live in the browser,
    //    streaming results in as the city sweep progresses so the feed fills fast.
    try {
      const apply = (places: Place[]) => {
        if (get().city.id !== city.id) return; // city changed mid-sweep — drop stale
        const map: Record<string, Place> = {};
        places.forEach((p) => (map[p.id] = p));
        set({ nearby: places, nearbyById: map, nearbyStatus: 'ready', nearbyUpdatedAt: null });
      };
      const places = await getProvider().searchNearby(city, apply);
      apply(places);
    } catch {
      // Graceful degradation: keep CDMX populated from the offline sample.
      const fb = city.id === 'cdmx' ? fixtureFallback(city) : [];
      const map: Record<string, Place> = {};
      fb.forEach((p) => (map[p.id] = p));
      set({ nearby: fb, nearbyById: map, nearbyStatus: fb.length ? 'fallback' : 'error', nearbyUpdatedAt: null });
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
    void pushSharedReview(rev, s.profile?.handle);
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

    // Restore this member's channel posts (merged over the seed in the screen).
    const channelPosts = await loadChannelPosts();
    if (channelPosts && Object.keys(channelPosts).length) set({ channelUserPosts: channelPosts });

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
        cloud.setSession(full);
        const prof = await profileForAuthUser(user, await loadProfile());
        if (!prof) {
          // A device account with no passport yet: make one.
          set({ authUser: user, session: full, screen: 'onboard', hydrated: true });
          return;
        }
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
        void startAccount(set, get);
        return;
      }
      // Token no longer valid — drop it and fall through to local/guest.
      await clearSession();
    }

    // 4) No auth session: fall back to the local (handle-based) profile as before.
    const p = await loadProfile();
    if (p) {
      set({ profile: p, city: cityById(p.cityId), screen: 'feed', nearbyStatus: 'idle', hydrated: true });
      void startAccount(set, get);
      return;
    }
    set({ screen: SKIP_ONBOARDING ? 'feed' : 'onboard', hydrated: true, cloud: cloud.cloudConfigured() ? 'local' : 'off' });
  },
  createProfile: (input) => {
    const p = makeProfile(input);
    saveProfile(p);
    set({ profile: p, city: cityById(p.cityId), nearby: [], nearbyById: {}, nearbyStatus: 'idle' });
    // A new passport starts empty, signs this device in and registers the username.
    void startAccount(set, get, { fresh: true });
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
  setBio: (text) => {
    const s = get();
    if (!s.profile) return;
    const p: Profile = { ...s.profile, bio: text.trim() || undefined };
    saveProfile(p); // kept local; not synced to the directory row
    set({ profile: p });
  },
  signOut: () => {
    const s = get();
    if (s.session) void signOutRemote(s.session.access_token);
    mineOwner = null;
    cloud.setSession(null);
    clearProfile();
    clearSession();
    set({ profile: null, authUser: null, session: null, authError: null, screen: 'onboard', obStep: 0, tastes: [], stamped: false, cloud: cloud.cloudConfigured() ? 'local' : 'off', syncedAt: null });
  },
  signInWithGoogle: () => {
    set({ authError: null });
    authSignInWithGoogle(); // navigates the browser to Google (web); no-op on native
  },
  connectAccount: async (handle) => {
    const found = await fetchProfileByHandle(handle);
    if (!found) return false;
    // A passport that belongs to a signed-in user comes back through their Google
    // sign-in, never by typing its handle.
    if (found.userId && found.userId !== cloud.currentSession()?.user.id) return 'google';
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
    void startAccount(set, get);
    return true;
  },
  // Before the passport is stamped: open the account (so everything brought in syncs
  // the moment it's created) and warm up the places index used to match imports.
  prepareSync: async () => {
    void loadAllSpots();
    if (!cloud.cloudConfigured() || cloud.currentSession()) return;
    set({ cloud: 'connecting', cloudNote: '' });
    const sess = await cloud.signInAnonymously();
    if (sess) {
      cloud.setSession(sess);
      await saveSession(sess);
      set({ session: sess, authUser: sess.user, cloud: 'local', cloudNote: 'Account ready — syncs when your passport is stamped.' });
    } else {
      const st = cloud.cloudState();
      set({ cloud: st.state === 'connecting' ? 'local' : st.state, cloudNote: st.note });
    }
  },
  syncNow: async () => {
    if (!get().profile) return;
    const remote = await cloud.pullMine();
    if (!remote) {
      if (cloud.currentSession()) set({ cloud: 'offline' });
      return;
    }
    cloud.markSynced(remote);
    mergeMine(get, set, remote);
    const ok = await pushNow(get);
    set({ cloud: ok ? 'synced' : 'offline', syncedAt: ok ? Date.now() : get().syncedAt });
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
  openVideo: (url, meta) => set({ videoUrl: url, videoMeta: meta || null }),
  closeVideo: () => set({ videoUrl: null, videoMeta: null }),

  // ── rich place details (live Google Place Details, web) ──
  loadPlaceDetails: async (placeId) => {
    const s = get();
    const status = s.placeDetailsStatus[placeId];
    // Fetch once per place per session (ready/empty are terminal).
    if (status === 'loading' || status === 'ready' || status === 'empty') return;
    const place = resolvePlace(placeId, s.nearbyById);
    const provider = getProvider();
    if (!place) {
      set((st) => ({ placeDetailsStatus: { ...st.placeDetailsStatus, [placeId]: 'empty' } }));
      return;
    }
    set({ placeDetailsStatus: { ...s.placeDetailsStatus, [placeId]: 'loading' } });

    // Resolve the Google place_id. Google-sourced places carry it in their id
    // ("g-" + place_id); curated guide venues don't, so we find their live
    // Google twin by coordinate — which also yields the venue's REAL Google Maps
    // photos (served live, with attribution, never stored), so each guide place
    // shows a real picture of where you're going. Gated on a name match so we
    // never adopt a neighbour's photos.
    let gid: string | null = placeId.startsWith('g-') ? placeId.slice(2) : null;
    if (!gid && place.source === 'carte' && place.lat != null && place.lon != null && provider.findNearest) {
      try {
        const twin = await provider.findNearest(place.lat, place.lon);
        if (twin && twin.id.startsWith('g-') && nameClose(place.name, twin.name)) {
          gid = twin.id.slice(2);
          if (twin.photoUrls?.length || twin.photoUrl) {
            set((st) => ({
              livePhotos: {
                ...st.livePhotos,
                [placeId]: { photoUrl: twin.photoUrl, photoUrls: twin.photoUrls, photoAttr: twin.photoAttr },
              },
            }));
          }
        }
      } catch {
        /* no twin — keep the stock photo */
      }
    }

    if (!gid || !provider.getDetails) {
      // No live details to show (may still have resolved real photos above).
      set((st) => ({ placeDetailsStatus: { ...st.placeDetailsStatus, [placeId]: 'empty' } }));
      return;
    }
    let det: PlaceDetails = {};
    try {
      det = await provider.getDetails(gid);
    } catch {
      det = {};
    }
    const has = !!(det && (det.weekdayHours || det.phone || det.website || det.summary || det.googleReviews));
    set((st) => ({
      placeDetails: { ...st.placeDetails, [placeId]: det },
      placeDetailsStatus: { ...st.placeDetailsStatus, [placeId]: has ? 'ready' : 'empty' },
    }));
  },

  // ── bring your places (Beli, Google Maps, notes, files) ──
  openImport: (source) => set({ importOpen: true, importSource: source ?? null }),
  closeImport: () => set({ importOpen: false }),
  applyImport: (items) => {
    const s = get();
    const ranked = s.ranked.slice();
    const pos = new Map(ranked.map((p, i) => [p.id, i]));
    const want = new Set(s.wantIds);
    const saved = { ...s.saved };
    let been = 0;
    let wanted = 0;
    for (const it of items) {
      const p = it.place;
      registeredPlaces[p.id] = registeredPlaces[p.id] || p;
      if (it.list === 'been') {
        const at = pos.get(p.id);
        if (at != null) {
          // already on the list: it's theirs now (even if the preview had it), and
          // their own score replaces a provisional or sample one
          const cur = ranked[at];
          const own = it.score != null && (cur.provisional || !s.profile);
          ranked[at] = { ...cur, importedFrom: cur.importedFrom || p.importedFrom || 'import', ...(own ? { score: it.score, provisional: false } : {}) };
          if (!s.profile) been++;
          continue;
        }
        const score = it.score ?? provisionalScore(p);
        ranked.push({ ...p, score, provisional: it.score == null, importedFrom: p.importedFrom || 'import' });
        pos.set(p.id, ranked.length - 1);
        want.delete(p.id);
        delete saved[p.id];
        been++;
      } else if (!pos.has(p.id)) {
        if (!want.has(p.id) || !importedWants.has(p.id)) wanted++;
        want.add(p.id);
        saved[p.id] = true;
        importedWants.add(p.id);
      }
    }
    ranked.sort((a, b) => (b.score || 0) - (a.score || 0));
    const src = items[0]?.place.importedFrom || 'file';
    set({ ranked, wantIds: [...want], saved, importCounts: { ...s.importCounts, [src]: (s.importCounts[src] || 0) + been + wanted } });
    return { been, want: wanted };
  },

  // ── build your passport from photos ──
  openPhotoImport: () =>
    set({ photoImportOpen: true, photoImportStatus: 'idle', photoMatches: [], photoScanned: 0, photoAdded: 0 }),
  closePhotoImport: () => set({ photoImportOpen: false }),
  runPhotoImport: async () => {
    if (!photoImportSupported()) {
      set({ photoImportStatus: 'unsupported' });
      return;
    }
    set({ photoImportStatus: 'picking', photoMatches: [], photoProgress: '' });
    let picked: { points: PhotoPoint[]; scanned: number };
    try {
      picked = await pickFoodPhotos();
    } catch {
      set({ photoImportStatus: 'error' });
      return;
    }
    if (!picked.points.length) {
      set({ photoImportStatus: picked.scanned ? 'nogps' : 'idle', photoScanned: picked.scanned });
      return;
    }
    // 1) where were they taken? — against every place CRTQ knows
    set({ photoImportStatus: 'matching', photoScanned: picked.scanned, photoProgress: 'Finding the places…' });
    const s0 = get();
    const spots = (await loadAllSpots()).filter((x) => !x.guide).map(spotToPlace);
    const grid = gridOf([...CARTE_CDMX, ...Object.values(byId), ...s0.nearby, ...spots]);
    const atPlace = picked.points.filter((pt) => !!nearestPlace(grid, pt.lat, pt.lon, 120));
    // 2) which of those are meals? — the on-device food scan (only photos at a place; capped)
    let foodScanned = false;
    const scores: (FoodScore | null)[] = atPlace.map(() => null);
    if (atPlace.length && foodScanSupported()) {
      set({ photoImportStatus: 'scanning', photoProgress: `Looking for food in ${atPlace.length} photo${atPlace.length === 1 ? '' : 's'}…` });
      const batch = atPlace.slice(0, 250);
      const res = await scanFood(
        batch.map((p) => p.preview),
        (done, total) => set({ photoProgress: `Looking for food… ${done} of ${total}` }),
      );
      res.forEach((r, i) => (scores[i] = r));
      foodScanned = res.some((r) => r != null);
    }
    const obs: PhotoObs[] = atPlace.map((p, i) => ({ lat: p.lat, lon: p.lon, time: p.time, preview: p.preview, food: scores[i]?.food ?? null, label: scores[i]?.label }));
    // 3) visits: meals grouped by place and day
    const visits = findVisits(obs, grid, { foodScanned });
    const matches: PhotoMatch[] = visits.map((v) => ({
      place: v.place,
      count: v.photos,
      preview: v.preview,
      distM: v.distM,
      picked: v.picked,
      visits: v.visits,
      foodPhotos: v.foodPhotos,
      confidence: v.confidence,
      labels: v.labels,
      alts: v.alts,
    }));
    // 4) photos nowhere near a known place: ask the live places provider, when there is one
    const provider = getProvider();
    if (provider.findNearest) {
      const far = dedupePoints(picked.points.filter((pt) => !atPlace.includes(pt))).slice(0, 25);
      for (const pt of far) {
        let place: Place | null = null;
        try {
          place = await provider.findNearest(pt.lat, pt.lon);
        } catch {
          place = null;
        }
        if (!place || place.lat == null || place.lon == null || matches.some((m) => m.place.id === place!.id)) continue;
        const d = haversine(pt.lat, pt.lon, place.lat, place.lon);
        if (d <= 120) matches.push({ place, count: pt.weight, preview: pt.preview, distM: Math.round(d), picked: d <= 60, confidence: d <= 60 ? 'medium' : 'low' });
      }
    }
    set({ photoMatches: matches, photoImportStatus: matches.length ? 'review' : 'nomatch', photoProgress: '' });
  },
  swapPhotoMatch: (id) =>
    set((s) => ({
      photoMatches: s.photoMatches.map((m) => {
        if (m.place.id !== id || !m.alts?.length) return m;
        // cycle through the places that close: the next becomes the match
        const [next, ...rest] = m.alts;
        return { ...m, place: next, alts: [...rest, m.place], picked: true };
      }),
    })),
  togglePhotoMatch: (id) =>
    set((s) => ({ photoMatches: s.photoMatches.map((m) => (m.place.id === id ? { ...m, picked: !m.picked } : m)) })),
  confirmPhotoMatches: () => {
    const s = get();
    const chosen = s.photoMatches.filter((m) => m.picked).map((m) => ({ ...m.place, importedFrom: 'photos' }));
    if (!chosen.length) {
      set({ photoImportStatus: 'done', photoAdded: 0 });
      return;
    }
    addVisitedPlaces(set, get, chosen);
    set({ photoImportStatus: 'done', photoAdded: chosen.length, importCounts: { ...s.importCounts, photos: (s.importCounts.photos || 0) + chosen.length } });
  },

  // ── monthly trending (most mentioned this month) ──
  loadMonthlyTrending: async (force) => {
    const s = get();
    if (s.monthlyTrendingStatus === 'loading') return;
    if (!force && s.monthlyTrendingStatus === 'ready') return;
    const cityId = s.city.id;
    const TTL = 12 * 60 * 60 * 1000; // recompute at most ~twice a day per city

    // Serve a fresh cache instantly; keep a stale one on screen while we refresh.
    const cached = await loadTrendingCache(cityId);
    if (cached && !force && Date.now() - cached.ts < TTL) {
      set({ monthlyTrending: cached.data, monthlyTrendingStatus: cached.data.length ? 'ready' : 'empty' });
      return;
    }
    if (cached && cached.data.length) set({ monthlyTrending: cached.data });
    set({ monthlyTrendingStatus: 'loading' });

    // Candidate pool: the city's curated places, TRENDING first, capped in the
    // provider. These are the venues we can also link back to in-app creators.
    const seen = new Set<string>();
    const candidates: Place[] = [];
    const push = (id: string) => {
      const p = byId[id];
      if (p && !seen.has(id)) {
        seen.add(id);
        candidates.push(p);
      }
    };
    // The city's guide venues, most acclaimed first, then the seed favourites.
    s.nearby
      .slice()
      .sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0))
      .forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          candidates.push(p);
        }
      });
    TRENDING.forEach(push);
    Object.keys(byId).forEach(push);

    let results: BuzzResult[] = [];
    try {
      results = await computeMonthlyTrending(candidates, get().city);
    } catch {
      results = [];
    }

    if (results.length) {
      saveTrendingCache(cityId, results);
      set({ monthlyTrending: results, monthlyTrendingStatus: 'ready' });
    } else if (cached && cached.data.length) {
      set({ monthlyTrending: cached.data, monthlyTrendingStatus: 'ready' });
    } else {
      set({ monthlyTrending: [], monthlyTrendingStatus: 'empty' });
    }
  },

  // ── club channels (structured chats) ──
  openChannel: (tag) => set({ activeChannel: tag, screen: 'channel' }),
  openChannelComposer: () => {
    const tag = get().activeChannel;
    if (!tag) return;
    const kindField = channelForm(tag).find((f) => f.key === 'kind');
    set({
      channelComposerOpen: true,
      channelDraftKind: kindField?.options?.length ? kindField.options[0] : '',
      channelDraft: {},
    });
  },
  closeChannelComposer: () => set({ channelComposerOpen: false }),
  setChannelDraftKind: (kind) => set({ channelDraftKind: kind }),
  setChannelDraftField: (key, value) => set((s) => ({ channelDraft: { ...s.channelDraft, [key]: value } })),
  postToChannel: () => {
    const s = get();
    const tag = s.activeChannel;
    if (!tag) return;
    const me = identity(s.profile);
    const fields = channelForm(tag)
      .filter((f) => f.key !== 'kind')
      .map((f) => ({ label: f.label, value: (s.channelDraft[f.key] || '').trim() }))
      .filter((f) => f.value);
    if (!fields.length) {
      set({ channelComposerOpen: false });
      return;
    }
    const post: ChannelPost = {
      id: 'u-' + tag + '-' + Date.now(),
      channel: tag,
      author: me.name,
      handle: me.handle,
      initials: me.initials,
      color: me.color,
      kind: s.channelDraftKind || undefined,
      fields,
      createdAt: Date.now(),
    };
    const next = { ...s.channelUserPosts, [tag]: [post, ...(s.channelUserPosts[tag] || [])] };
    saveChannelPosts(next);
    set({ channelUserPosts: next, channelComposerOpen: false, channelDraft: {}, channelDraftKind: '' });
  },

  // ── taste identity ──
  openFoodie: (id) => set((s) => ({ activeFoodieId: id, screen: 'foodie', foodieReturn: s.screen === 'foodie' ? s.foodieReturn : s.screen })),
  closeFoodie: () => set((s) => ({ screen: s.foodieReturn || 'board' })),
  openMyProfile: () => set({ tab: 'you', screen: 'you', activePlaceId: null, profileStack: [], passportAt: 'data' }),
  openTasteCard: () => set({ tasteCardOpen: true }),
  closeTasteCard: () => set({ tasteCardOpen: false }),
}));

// Your data follows every change: saved on the device right away, sent to the
// server a moment later (batched), and refreshed when the app comes back.
useStore.subscribe((s, prev) => {
  if (!s.profile || mineOwner !== s.profile.handle) return;
  const dataChanged = s.ranked !== prev.ranked || s.wantIds !== prev.wantIds || s.follows !== prev.follows;
  if (dataChanged || s.saved !== prev.saved || s.userReviews !== prev.userReviews) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persistMine(useStore.getState), 300);
  }
  if (dataChanged && cloud.currentSession()) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const ok = await pushNow(useStore.getState);
      useStore.setState(ok ? { cloud: 'synced', syncedAt: Date.now() } : { cloud: 'offline', cloudNote: 'Some changes are waiting to sync.' });
    }, 1500);
  }
});

// A refreshed token is remembered (so the session survives a reload).
cloud.onSessionChange((sess) => {
  if (sess) {
    void saveSession(sess);
    useStore.setState({ session: sess });
  }
});

// Each time the app comes back to the foreground (after a minute away), pull the latest.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 60_000) void useStore.getState().syncNow();
  });
}

/** Loose venue-name slug for matching a curated place to its Google twin. */
function nameSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when two venue names are close enough to be the same place. */
function nameClose(a: string, b: string): boolean {
  const A = nameSlug(a);
  const B = nameSlug(b);
  if (!A || !B) return false;
  if (A === B || A.includes(B) || B.includes(A)) return true;
  const at = new Set(A.split(' ').filter((w) => w.length > 2));
  const bt = B.split(' ').filter((w) => w.length > 2);
  if (!at.size || !bt.length) return false;
  const hit = bt.filter((w) => at.has(w)).length;
  return hit / Math.min(at.size, bt.length) >= 0.5;
}

// ── build-your-passport-from-photos internals ──
function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Collapse photos taken at essentially the same spot (≤25 m) into one lookup. */
function dedupePoints(points: PhotoPoint[]): { lat: number; lon: number; preview: string; weight: number }[] {
  const clusters: { lat: number; lon: number; preview: string; weight: number }[] = [];
  for (const p of points) {
    const c = clusters.find((x) => haversine(x.lat, x.lon, p.lat, p.lon) <= 25);
    if (c) c.weight += 1;
    else clusters.push({ lat: p.lat, lon: p.lon, preview: p.preview, weight: 1 });
  }
  return clusters;
}

/** A sensible starting score for an auto-added "been" place (Google 0–5 → 0–10). */
function provisionalScore(p: Place): number {
  const r = typeof p.rating === 'number' ? Math.round(p.rating * 2 * 10) / 10 : 7.0;
  return Math.max(3, Math.min(9.9, r));
}

/** Register confirmed photo-matches into the user's log (resolvable + sorted). */
function addVisitedPlaces(set: (partial: Partial<State>) => void, get: () => State, places: Place[]) {
  const s = get();
  const ranked = s.ranked.slice();
  const nearbyById = { ...s.nearbyById };
  const have = new Set(ranked.map((r) => r.id));
  const want = new Set(s.wantIds);
  for (const p of places) {
    nearbyById[p.id] = p; // make it resolvable in detail / log views
    registeredPlaces[p.id] = p; // …and keep it resolvable after a city reload
    want.delete(p.id);
    if (have.has(p.id)) continue;
    ranked.push({ ...p, score: provisionalScore(p), provisional: true, rated: false });
    have.add(p.id);
  }
  ranked.sort((a, b) => (b.score || 0) - (a.score || 0));
  set({ ranked, nearbyById, wantIds: Array.from(want) });
}

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
