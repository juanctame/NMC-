/**
 * Sample data for CRTQ, ported verbatim from the prototype's component
 * constructor. In a production build this becomes API/models (places, dual
 * critic/people scores + rankings, user log, friends graph, events/RSVPs,
 * tables with visibility, club membership, geolocation, media, trending feed).
 *
 * Color fields keep the design-system `var(--token)` form and are resolved with
 * `col()` at the point of use. `photo` fields are asset keys (see ../assets).
 */

export type Place = {
  id: string;
  name: string;
  cuisine: string;
  hood: string;
  price: string;
  photo: string;
  addr: string;
  blurb: string;
  openInfo: string;
  score?: number;
  by?: string;
  critic?: number;
  people?: number;
  // Real-data fields (populated by live providers; absent on seed data).
  lat?: number;
  lon?: number;
  source?: 'seed' | 'osm' | 'google';
  website?: string;
  rated?: boolean; // false for freshly-discovered places with no ratings yet
  rating?: number; // Google's 0–5 community rating (live places)
  reviews?: number; // Google review count
};

const P = (
  id: string,
  name: string,
  cuisine: string,
  hood: string,
  price: string,
  photo: string,
  addr: string,
  blurb: string,
  openInfo: string,
): Place => ({ id, name, cuisine, hood, price, photo, addr, blurb, openInfo });

export const RANKED0: Place[] = [
  { ...P('vilsito', 'El Vilsito', 'Tacos', 'Narvarte', '$', 'butcher-sandwich', 'Av. Universidad 1900', 'Suadero and al pastor straight off the trompo until 2am — a body-shop by day, a taquería institution by night.', 'open till 02:00'), score: 9.4 },
  { ...P('rosetta', 'Panadería Rosetta', 'Panadería', 'Roma Nte', '$$', 'brioche-toast', 'Colima 179', 'Guava-and-cream rolls and concha french toast in a townhouse. Get there before the window empties.', '07:00–21:00'), score: 9.1 },
  { ...P('contramar', 'Contramar', 'Mariscos', 'Roma Nte', '$$$', 'french-dip', 'Durango 200', 'The tuna tostada and pescado a la talla that launched a thousand imitators. Long lunches only.', '13:00–18:30'), score: 8.8 },
  { ...P('medellin', 'Mercado de Medellín', 'Mercado', 'Roma Sur', '$', 'beijing-stall', 'Campeche 101', 'Blue-corn tlacoyos, second aisle past the flowers. Cash only, no seats, all worth it.', '08:00–18:00'), score: 8.3 },
  { ...P('opera', 'La Ópera', 'Cantina', 'Centro', '$$', 'elder-at-bar', '5 de Mayo 10', 'Belle-époque cantina with vermouth, botanas, and the bullet hole Pancho Villa (allegedly) left in the ceiling.', '13:00–24:00'), score: 7.6 },
  { ...P('moro', 'Churrería El Moro', 'Postres', 'Centro', '$', 'hot-honey', 'Eje Central 42', 'Churros and four kinds of thick chocolate, open around the clock since 1935.', '24 hours'), score: 7.1 },
  { ...P('delirio', 'Delirio', 'Deli', 'Roma Nte', '$$', 'italian-deli', 'Monterrey 116', 'Enrique Olvera’s corner deli — grab a coffee, a sandwich, and something from the case.', '08:00–20:00'), score: 6.4 },
  { ...P('corazon', 'Corazón de Maguey', 'Mole', 'Coyoacán', '$$', 'chef-plating', 'Plaza Jardín Centenario 9A', 'Plaza-side Oaxacan cooking with a mezcal list longer than the menu. Touristy, still good.', '13:00–23:00'), score: 5.8 },
];

export const WANT0: Place[] = [
  { ...P('pujol', 'Pujol', 'Tasting', 'Polanco', '$$$', 'chef-plating', 'Tennyson 133', 'Mole madre, aged for years and counting. The reservation is the hard part.', '13:30–22:30'), by: 'Rosa ranks it 9.6' },
  { ...P('maximo', 'Máximo Bistrot', 'Contemporary', 'Roma Nte', '$$$', 'storefront-green', 'Anatole France 40', 'Market-driven tasting from Eduardo García. Book weeks out.', '13:00–22:00'), by: '3 friends want this' },
  { ...P('expendio', 'Expendio de Maíz', 'Antojitos', 'Roma Nte', '$', 'beijing-stall', 'Yucatán 84', 'No menu — they cook heirloom corn at you until you tap out. Standing room.', '13:00–19:00'), by: 'Mariana’s top save' },
  { ...P('turix', 'El Turix', 'Yucateca', 'Polanco', '$', 'french-dip', 'Emilio Castelar 212', 'Cochinita and panuchos from a hole in the wall, till the pib runs out.', '11:00–18:00'), by: 'Diego ranks it 9.0' },
];

export const CAND: Place[] = [
  P('orinoco', 'Taquería Orinoco', 'Tacos', 'Roma Nte', '$', 'butcher-sandwich', 'Álvaro Obregón 179', 'Northern-style tacos and the famous chicharrón, late into the night.', '18:00–03:00'),
  P('lardo', 'Lardo', 'Mediterránea', 'Condesa', '$$', 'italian-deli', 'Agustín Melgar 6', 'Elena Reygadas’ all-day Condesa spot — wood-oven everything.', '09:00–23:00'),
  P('blanco', 'Blanco Colima', 'Contemporary', 'Roma Nte', '$$$', 'chef-plating', 'Colima 168', 'A restored mansion with courtyards, cocktails, and a see-and-be-seen crowd.', '13:00–01:00'),
  P('nin', 'Café Nin', 'Café', 'Juárez', '$$', 'brioche-toast', 'Havre 73', 'Rosetta’s café sibling — brunch, pastries, and a leafy patio.', '07:30–22:00'),
];

export type Friend = {
  id: string;
  name: string;
  initials: string;
  color: string;
  year: number;
  total: number;
  match: string;
};

export const FRIENDS: Friend[] = [
  { id: 'rm', name: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', year: 63, total: 214, match: '92%' },
  { id: 'df', name: 'Diego Fuentes', initials: 'DF', color: 'var(--stamp-blue)', year: 51, total: 187, match: '88%' },
  { id: 'ml', name: 'Mariana López', initials: 'ML', color: 'var(--stamp-green)', year: 48, total: 176, match: '85%' },
  { id: 'sr', name: 'Sofía Reyes', initials: 'SR', color: 'var(--stamp-pink)', year: 44, total: 132, match: '74%' },
  { id: 'av', name: 'Andrés Vega', initials: 'AV', color: 'var(--ink-400)', year: 39, total: 149, match: '79%' },
];

export const FRIENDS_AT: Record<string, [string, string, number][]> = {
  vilsito: [['RM', 'var(--sun-500)', 9.1], ['DF', 'var(--stamp-blue)', 8.7]],
  contramar: [['SR', 'var(--stamp-pink)', 9.0], ['ML', 'var(--stamp-green)', 8.5]],
  orinoco: [['RM', 'var(--sun-500)', 9.2], ['AV', 'var(--ink-400)', 8.9], ['ML', 'var(--stamp-green)', 8.4]],
  medellin: [['ML', 'var(--stamp-green)', 8.6]],
  rosetta: [['DF', 'var(--stamp-blue)', 9.2], ['RM', 'var(--sun-500)', 8.9]],
  turix: [['DF', 'var(--stamp-blue)', 9.0]],
  pujol: [['RM', 'var(--sun-500)', 9.6], ['SR', 'var(--stamp-pink)', 9.3]],
};

export type FeedItem =
  | {
      kind: 'act';
      who: string;
      initials: string;
      color: string;
      verb: string;
      time: string;
      placeId: string;
      score: number | null;
      meta: string;
      caption: string;
      likes: number;
      comments: number;
    }
  | { kind: 'rec'; placeId: string; reason: string; match: string }
  | { kind: 'club' };

export const FEED: FeedItem[] = [
  { kind: 'act', who: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', verb: 'ranked a new spot', time: '2h', placeId: 'vilsito', score: 9.1, meta: 'Tacos · Narvarte', caption: 'Back for the suadero at 1am. Still the one I measure every other taco against.', likes: 14, comments: 3 },
  { kind: 'rec', placeId: 'orinoco', reason: 'Because you rank Tacos high · Rosa & 2 others love it', match: '94%' },
  { kind: 'act', who: 'Mariana López', initials: 'ML', color: 'var(--stamp-green)', verb: 'ranked a new spot', time: '5h', placeId: 'medellin', score: 8.6, meta: 'Mercado · Roma Sur', caption: 'The tlacoyo lady deserves a star. Blue corn, requesón, second aisle from the flowers.', likes: 22, comments: 5 },
  { kind: 'club' },
  { kind: 'act', who: 'Diego Fuentes', initials: 'DF', color: 'var(--stamp-blue)', verb: 'saved a spot to want-to-try', time: '1d', placeId: 'contramar', score: null, meta: 'Mariscos · Roma Nte', caption: 'Adding this to the list for when my parents visit. Everyone says the tostada.', likes: 8, comments: 1 },
];

export type Rec = { placeId: string; match: string; reason: string };
export const RECS: Rec[] = [
  { placeId: 'orinoco', match: '94%', reason: 'Rosa & 2 others rank it 9+' },
  { placeId: 'maximo', match: '89%', reason: 'Matches your Roma Nte splurges' },
  { placeId: 'turix', match: '86%', reason: 'You rank Yucateca high' },
  { placeId: 'lardo', match: '81%', reason: '3 friends went this month' },
];

export type EventT = {
  id: string;
  d: string;
  mo: string;
  wd: string;
  time: string;
  title: string;
  route: string;
  meet: string;
  host: string;
  spots: number;
  taken: number;
  menu: string[];
  note: string;
  // open-table extras
  mine?: boolean;
  opener?: [string, string];
  visibility?: 'public' | 'private';
  photo?: string;
  joined?: [string, string][];
};

export const EVENTS: EventT[] = [
  { id: 'crawl12', d: '18', mo: 'JUL', wd: 'FRI', time: '19:30', title: 'Taco Crawl Nº 12', route: 'Roma Norte → Condesa', meet: 'Fuente de Cibeles', host: 'Chef Maria · verified', spots: 12, taken: 9, menu: ['El Pescadito — Baja fish tacos', 'Orinoco — the famous chicharrón', 'El Moro — churros to close'], note: 'Free to join — we split each bill at the table. Rain or shine; bring a light jacket.' },
  { id: 'tasting', d: '20', mo: 'JUL', wd: 'SUN', time: '19:00', title: 'Private Taco Tasting', route: 'Back room · El Vilsito', meet: 'the trompo', host: 'Hosted by Rosa M.', spots: 10, taken: 10, menu: ['Suadero, three ways', 'Al pastor off the spit', 'Aguas frescas on the house'], note: 'This table is full. Join the waitlist and we’ll stamp you in if a seat opens.' },
  { id: 'mercado', d: '24', mo: 'JUL', wd: 'THU', time: '09:00', title: 'Mercado Walk + Breakfast', route: 'Mercado de Medellín', meet: 'the flower aisle', host: 'Hosted by Mariana L.', spots: 8, taken: 5, menu: ['Tlacoyos + café de olla', 'Fruit-stand tour, in season', 'Flower aisle detour, always'], note: 'Bring cash and an empty stomach. We walk slow and eat fast.' },
];

export type ClubEvent = {
  id: string;
  mo: string;
  d: string;
  wd: string;
  time: string;
  title: string;
  place: string;
  seats: number;
  left: number;
  feat: boolean;
  photo: string;
  desc: string;
};

export const CLUB_EVENTS: ClubEvent[] = [
  { id: 'dc4', mo: 'AUG', d: '02', wd: 'SAT', time: '20:00', title: 'Mole Negro Study Nº 04', place: 'Secret address · Juárez', seats: 10, left: 3, feat: true, photo: 'chef-plating', desc: 'Eight moles across four courses at one long table. Chef Maria cooks; you compare notes. Address shared 24h before.' },
  { id: 'dc5', mo: 'AUG', d: '15', wd: 'FRI', time: '01:00', title: 'Late-Night Suadero Council', place: 'El Vilsito · after close', seats: 8, left: 5, feat: false, photo: 'butcher-sandwich', desc: 'The trompo, all to ourselves, once the doors shut.' },
  { id: 'dc6', mo: 'SEP', d: '05', wd: 'FRI', time: '19:00', title: 'Mariscos on the Rooftop', place: 'La Docena terrace', seats: 12, left: 8, feat: false, photo: 'french-dip', desc: 'Tostadas and cold beer, six floors up, golden hour.' },
];

const GREEN = 'var(--stamp-green)';
const BLUE = 'var(--stamp-blue)';
const PINK = 'var(--stamp-pink)';
const SUN6 = 'var(--sun-600)';
const INK4 = 'var(--ink-400)';

export type CardData = {
  app: string;
  dot: string;
  title?: string;
  sub?: string;
  quote?: string;
  cta: string;
  ctaColor: string;
  rows?: [string, string][];
};
export type Message = {
  who?: string;
  host?: boolean;
  whoColor?: string;
  time?: string;
  text?: string;
  pinned?: boolean;
  best?: boolean;
  mine?: boolean;
  card?: CardData;
};
export type Thread = {
  id: string;
  name: string;
  initials: string;
  color: string;
  sub: string;
  last: string;
  unread: number;
  club?: boolean;
  msgs: Message[];
};

export const CLUB_THREADS: Thread[] = [
  { id: 'dct1', name: 'Members table', initials: '✦', color: 'var(--ink-400)', sub: 'members only · 42 seats', last: 'Chef Maria: address drops Friday', unread: 2, club: true, msgs: [
    { who: 'Chef Maria', host: true, whoColor: 'var(--ink-400)', time: '20:14', text: 'Nº 04 is locked — ten of us. Address drops here 24h before. Come hungry, leave your phone in the basket.' },
    { who: 'Rosa Méndez', whoColor: 'var(--sun-600)', time: '20:22', text: 'Counting the days. Bringing a bottle of the good mezcal.' },
  ] },
  { id: 'dct2', name: 'Openings & scoops', initials: '!', color: 'var(--stamp-blue)', sub: 'before anyone else', last: 'New omakase counter in Juárez — 6 seats', unread: 1, club: true, msgs: [
    { who: 'CRTQ', whoColor: 'var(--stamp-blue)', time: '09:30', card: { app: 'Scoop · members first', dot: 'var(--stamp-blue)', title: 'Kaito — omakase counter, Juárez', sub: 'Soft-opens Thu · 6 seats a night · members book first', cta: 'Claim a seat →', ctaColor: 'var(--stamp-blue)' } },
    { who: 'Andrés Vega', whoColor: 'var(--ink-400)', time: '09:41', text: 'Grabbing Thursday. Who’s in?' },
  ] },
];

export const OPEN: EventT[] = [
  { id: 'ot1', d: '19', mo: 'JUL', wd: 'SAT', time: '14:00', title: 'Sobremesa at Lardo', route: 'Lardo · Condesa', meet: 'the corner table', host: 'Rosa opened this table', opener: ['RM', 'var(--sun-500)'], spots: 6, taken: 3, photo: 'italian-deli', menu: ['Wood-oven everything', 'A long, slow lunch', 'Split the bill, no math'], visibility: 'public', note: 'Opened this for a lazy Saturday. Come hungry, stay for coffee.', joined: [['RM', 'var(--sun-500)'], ['DF', 'var(--stamp-blue)'], ['SR', 'var(--stamp-pink)']] },
  { id: 'ot2', d: '21', mo: 'JUL', wd: 'MON', time: '20:30', title: 'Mezcal + tostadas', route: 'Contramar → Bósforo', meet: 'Contramar bar', host: 'Andrés opened this table', opener: ['AV', 'var(--ink-400)'], visibility: 'private', spots: 4, taken: 2, photo: 'french-dip', menu: ['Tuna tostadas to start', 'Walk over to Bósforo', 'Espadín, gently'], note: 'Two of us so far — looking for two more who take their mezcal neat.', joined: [['AV', 'var(--ink-400)'], ['ML', 'var(--stamp-green)']] },
  { id: 'ot3', d: '22', mo: 'JUL', wd: 'TUE', time: '13:30', title: 'Tlacoyos before work', route: 'Mercado de Medellín', meet: 'the flower aisle', host: 'Mariana opened this table', opener: ['ML', 'var(--stamp-green)'], visibility: 'private', spots: 5, taken: 2, photo: 'beijing-stall', menu: ['Blue-corn tlacoyos', 'Café de olla', 'Flower-aisle detour'], note: 'Friends-of-friends welcome once we’ve met. Follow me back to grab a seat.', joined: [['ML', 'var(--stamp-green)'], ['SR', 'var(--stamp-pink)']] },
];

export const PARTY: Record<string, [string, string][]> = {
  crawl12: [['CM', 'var(--sun-500)'], ['DF', 'var(--stamp-blue)'], ['ML', 'var(--stamp-green)'], ['SR', 'var(--stamp-pink)'], ['AV', 'var(--ink-400)']],
  tasting: [['RM', 'var(--sun-500)'], ['DF', 'var(--stamp-blue)'], ['SR', 'var(--stamp-pink)']],
  mercado: [['ML', 'var(--stamp-green)'], ['RM', 'var(--sun-500)']],
};

export type WhenOpt = { label: string; d: string; mo: string; wd: string; time: string };
export const WHEN_OPTS: WhenOpt[] = [
  { label: 'Tonight 20:00', d: '18', mo: 'JUL', wd: 'FRI', time: '20:00' },
  { label: 'Sat 14:00', d: '19', mo: 'JUL', wd: 'SAT', time: '14:00' },
  { label: 'Sun 13:00', d: '20', mo: 'JUL', wd: 'SUN', time: '13:00' },
  { label: 'Thu 21:00', d: '24', mo: 'JUL', wd: 'THU', time: '21:00' },
];

export const THREADS: Thread[] = [
  { id: 'ann', name: 'Announcements', initials: '!', color: 'var(--ink-400)', sub: 'only hosts can post', last: 'Chef Maria: Mole Nº 04 books Thursday', unread: 1, msgs: [
    { who: 'House rules', pinned: true, text: 'Real recs, real photos. No hate, no spam, no creeps. Hosts hold your seat — honor it.' },
    { who: 'Chef Maria', host: true, whoColor: INK4, time: '10:02', text: 'Mole Negro Study Nº 04 — ten seats open Thursday 10:00, members first. Secret address in Juárez, shared 24h before.' },
    { who: 'CRTQ', whoColor: BLUE, time: '10:03', card: { app: 'Google Calendar · this week', dot: BLUE, cta: 'Sync all to Calendar →', ctaColor: BLUE, rows: [['Taco Crawl Nº 12', 'FRI 19:30'], ['Private Tasting', 'SUN · full'], ['Mercado Walk', 'THU 09:00']] } },
  ] },
  { id: 'crawl12', name: 'Taco Crawl Nº 12', initials: '12', color: 'var(--sun-500)', sub: '9 going · Chef Maria hosts', last: 'Maria dropped a pin · Cibeles', unread: 3, msgs: [
    { who: 'Chef Maria', host: true, whoColor: INK4, time: '17:41', text: 'Tonight! Meet 19:30 at Cibeles. Three stops, we split each bill at the table. Pin below →' },
    { who: 'Chef Maria', host: true, whoColor: INK4, time: '17:41', card: { app: 'Google Maps', dot: GREEN, title: 'Fuente de Cibeles', sub: 'Plaza Villa de Madrid · Roma Norte · 4 min from Metrobús', cta: 'Open in Google Maps →', ctaColor: GREEN } },
    { who: 'Rosa Méndez', whoColor: PINK, time: '17:52', card: { app: 'Beli · Rosa’s list', dot: PINK, quote: 'Ranked our stops, if you want homework.', cta: 'Save to my Beli →', ctaColor: PINK, rows: [['1 · El Pescadito', '9.2'], ['2 · Orinoco', '8.9'], ['3 · El Moro', '8.7']] } },
    { who: 'Andrés Vega', whoColor: INK4, time: '18:04', card: { app: 'Splitwise · crawl Nº 11', dot: SUN6, title: 'MX$1,840 · nine of us', sub: 'MX$204 each · Andrés fronted it', cta: 'Settle up →', ctaColor: SUN6 } },
  ] },
  { id: 'recs', name: 'Recs', initials: '?', color: 'var(--stamp-blue)', sub: '412 members · ask the table', last: 'Mariana shared a Beli list', unread: 4, msgs: [
    { who: 'Priya S.', whoColor: PINK, time: '15:58', text: 'Best vegetarian tacos in Roma Norte? Cousin’s visiting — one night only, no pressure.' },
    { who: 'Mariana López', whoColor: GREEN, time: '16:10', best: true, card: { app: 'Beli · Mariana’s tacos, ranked', dot: PINK, quote: 'Por Siempre Vegana — the trompo is seitan and it fools everyone.', cta: 'Save to my Beli →', ctaColor: PINK, rows: [['1 · Por Siempre Vegana', '9.4'], ['2 · Gracias Madre', '8.8']] } },
    { who: 'Andrés Vega', whoColor: INK4, time: '16:22', card: { app: 'Google Maps', dot: GREEN, title: 'Por Siempre Vegana', sub: 'Manzanillo esq. Guanajuato · open till 23:00', cta: 'Open in Google Maps →', ctaColor: GREEN } },
  ] },
];

export type AppItem = {
  name: string;
  glyph: string;
  color: string;
  fg: string;
  rot: string;
  card?: CardData;
  text?: string;
};

export const APPS: AppItem[] = [
  { name: 'Maps pin', glyph: '↓', color: GREEN, fg: '#E9F3EA', rot: '-5deg', card: { app: 'Google Maps', dot: GREEN, title: 'Panadería Rosetta', sub: 'Colima 179 · Roma Norte', cta: 'Open in Google Maps →', ctaColor: GREEN } },
  { name: 'Beli list', glyph: 'B', color: PINK, fg: '#FBE5ED', rot: '4deg', card: { app: 'Beli · my list', dot: PINK, quote: 'Sweet CDMX, ranked.', cta: 'Save to my Beli →', ctaColor: PINK, rows: [['1 · Rosetta', '9.1'], ['2 · El Moro', '7.1']] } },
  { name: 'Calendar', glyph: '18', color: BLUE, fg: '#E2F0F7', rot: '-3deg', card: { app: 'Google Calendar', dot: BLUE, title: 'Mercado Walk', sub: 'THU 09:00 · Mercado de Medellín', cta: 'Add to Calendar →', ctaColor: BLUE } },
  { name: 'Split bill', glyph: '$', color: 'var(--sun-400)', fg: 'var(--ink-deep)', rot: '5deg', card: { app: 'Splitwise', dot: SUN6, title: 'Started a split for tonight', sub: 'Add your plates as we go', cta: 'Open Splitwise →', ctaColor: SUN6 } },
  { name: 'Resy table', glyph: 'R', color: INK4, fg: 'var(--paper-0)', rot: '-4deg', card: { app: 'Resy', dot: INK4, title: 'Table for 4 · Sat 20:30', sub: 'La Docena · 2 slots left', cta: 'Grab it on Resy →', ctaColor: INK4 } },
  { name: 'Photo', glyph: '▣', color: 'var(--paper-0)', fg: INK4, rot: '3deg', text: 'Dropped a photo from last night’s run.' },
];

/** Relative pin coordinates on the stylized CDMX map (x: west→east, y: north→south). */
export const MAP_PTS: Record<string, { x: number; y: number; walk: string }> = {
  crawl12: { x: 57, y: 45, walk: '6 min walk' },
  tasting: { x: 71, y: 72, walk: '18 min · Metro' },
  mercado: { x: 61, y: 60, walk: '9 min walk' },
  vilsito: { x: 74, y: 75, walk: '17 min · Metro' },
  rosetta: { x: 52, y: 43, walk: '5 min walk' },
  contramar: { x: 49, y: 50, walk: '7 min walk' },
  medellin: { x: 63, y: 62, walk: '9 min walk' },
  opera: { x: 73, y: 19, walk: '22 min · Metro' },
  moro: { x: 76, y: 24, walk: '24 min · Metro' },
  orinoco: { x: 62, y: 53, walk: '8 min walk' },
  maximo: { x: 47, y: 45, walk: '6 min walk' },
  turix: { x: 24, y: 22, walk: '20 min · Metro' },
  lardo: { x: 38, y: 58, walk: '11 min walk' },
};

export const EVENT_PHOTO: Record<string, string> = {
  crawl12: 'butcher-sandwich',
  tasting: 'butcher-sandwich',
  mercado: 'beijing-stall',
};

/** Rotten-Tomatoes-style dual scores per place: [critics %, people %]. */
export const SCORES: Record<string, [number, number]> = {
  vilsito: [96, 94], rosetta: [92, 90], contramar: [98, 88], medellin: [84, 91],
  opera: [78, 82], moro: [72, 88], delirio: [69, 74], corazon: [63, 71],
  pujol: [99, 85], maximo: [95, 89], expendio: [90, 93], turix: [93, 96],
  orinoco: [91, 95], lardo: [88, 86], blanco: [80, 77], nin: [82, 90],
};

export const TRENDING = ['orinoco', 'vilsito', 'turix', 'contramar', 'rosetta'];

export const BANDS: Record<'loved' | 'fine' | 'meh', [number, number]> = {
  loved: [8.0, 10.0],
  fine: [6.0, 7.9],
  meh: [3.0, 5.9],
};

// ── Derived lookups ─────────────────────────────────────────────────────────

export const byId: Record<string, Place> = {};
[...RANKED0, ...WANT0, ...CAND].forEach((p) => {
  byId[p.id] = p;
});

const sids = Object.keys(SCORES).filter((id) => byId[id]);
// Critics/People are stored as 0–100 but exposed on the 0–10 scale so every
// score in the app shares one consistent format (the Beli rank scale).
sids.forEach((id) => {
  byId[id].critic = Math.round(SCORES[id][0]) / 10;
  byId[id].people = Math.round(SCORES[id][1]) / 10;
});

const rankBy = (arr: string[], k: 0 | 1): Record<string, number> => {
  const m: Record<string, number> = {};
  arr
    .slice()
    .sort((a, b) => SCORES[b][k] - SCORES[a][k])
    .forEach((id, i) => {
      m[id] = i + 1;
    });
  return m;
};

export type RankTable = {
  total: number;
  critO: Record<string, number>;
  popO: Record<string, number>;
  critC: Record<string, number>;
  popC: Record<string, number>;
  cuisineTotal: Record<string, number>;
};

export const RANK: RankTable = {
  total: sids.length,
  critO: rankBy(sids, 0),
  popO: rankBy(sids, 1),
  critC: {},
  popC: {},
  cuisineTotal: {},
};

const byCuisine: Record<string, string[]> = {};
sids.forEach((id) => {
  const c = byId[id].cuisine;
  (byCuisine[c] = byCuisine[c] || []).push(id);
});
Object.keys(byCuisine).forEach((c) => {
  const g = byCuisine[c];
  RANK.cuisineTotal[c] = g.length;
  const rc = rankBy(g, 0);
  const rp = rankBy(g, 1);
  g.forEach((id) => {
    RANK.critC[id] = rc[id];
    RANK.popC[id] = rp[id];
  });
});
