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

  mapFilter: 'all' | 'event' | 'spot' | 'rec';
  selPin: PinRef;

  createdTables: any[];
  createOpen: boolean;
  cPlaceId: string;
  cWhen: string;
  cSeats: number;
  cVisibility: 'public' | 'private';

  clubUnlocked: boolean;
  logoTaps: number;
  lastTap: number;
  clubSeg: 'events' | 'community';

  userPhotos: Record<string, string[]>;
  reelIndex: number;
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
  openCreate: () => void;
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
};

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
  cPlaceId: 'lardo',
  cWhen: 'Sat 14:00',
  cSeats: 6,
  cVisibility: 'public',
  clubUnlocked: false,
  logoTaps: 0,
  lastTap: 0,
  clubSeg: 'events',
  userPhotos: {},
  reelIndex: 0,
});

function findTable(s: State, id: string | null) {
  return [...s.createdTables, ...OPEN, ...EVENTS].find((t) => t.id === id);
}

function rankRow(s: State, id: string) {
  const idx = s.ranked.findIndex((r) => r.id === id);
  return idx < 0 ? null : { idx, item: s.ranked[idx] };
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
  reelGo: (d) => set((s) => ({ reelIndex: (s.reelIndex + d + 5) % 5 })),

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
  openCreate: () => set({ createOpen: true }),
  closeCreate: () => set({ createOpen: false }),
  setCreate: (patch) => set(patch as any),
  createTable: () => {
    const s = get();
    const place = byId[s.cPlaceId] || CAND[0];
    const when = WHEN_OPTS.find((w) => w.label === s.cWhen) || WHEN_OPTS[0];
    const id = 'ct' + (s.createdTables.length + 1);
    const t = {
      id,
      mine: true,
      d: when.d,
      mo: when.mo,
      wd: when.wd,
      time: when.time,
      title: place.name,
      route: place.hood + ' · you host',
      meet: place.name,
      host: 'You opened this table',
      opener: ['JO', 'var(--sun-400)'],
      visibility: s.cVisibility,
      spots: s.cSeats,
      taken: 1,
      photo: place.photo,
      menu: ['Order for the table', 'Split the bill, no math', 'Meet your neighbors'],
      note: 'You opened this table. Invite friends or let the community fill the seats.',
      joined: [['JO', 'var(--sun-400)']],
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
  const base = byId[s.rankId!];
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
