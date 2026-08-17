/**
 * Featured creators — the aspirational voices we want to promote in the Feed.
 * Each carries a real short-form post (platform + source URL) and a 0–10
 * verdict, modelling the kind of content CRTQ surfaces. Seeded now;
 * later this becomes a curated/creator-partnership feed.
 */

export type Platform = 'tiktok' | 'instagram' | 'youtube';

export type CreatorReview = {
  id: string;
  creator: string;
  handle: string;
  followers: string;
  verified: boolean;
  initials: string;
  color: string;
  placeId: string;
  score: number; // 0–10
  text: string;
  platform: Platform;
  sourceUrl: string;
};

export const CREATOR_REVIEWS: CreatorReview[] = [
  {
    id: 'cr-1',
    creator: 'Marco Tostado',
    handle: '@tacotour',
    followers: '512k',
    verified: true,
    initials: 'MT',
    color: 'var(--ink-400)',
    placeId: 'vilsito',
    score: 9.5,
    text: 'Stop the count — the 1am suadero here is the single best taco in CDMX. I ate five. No notes.',
    platform: 'tiktok',
    sourceUrl: 'https://www.tiktok.com/@tacotour',
  },
  {
    id: 'cr-2',
    creator: 'Paola “La Antojada” Ruiz',
    handle: '@laantojada',
    followers: '214k',
    verified: true,
    initials: 'PR',
    color: 'var(--stamp-pink)',
    placeId: 'contramar',
    score: 9.3,
    text: 'The tuna tostada is worth the two-hour lunch. Bring your most patient friend and order everything.',
    platform: 'instagram',
    sourceUrl: 'https://www.instagram.com/laantojada',
  },
  {
    id: 'cr-3',
    creator: 'Sam Whitfield',
    handle: '@thehungrynomad',
    followers: '1.2M',
    verified: true,
    initials: 'SW',
    color: 'var(--stamp-blue)',
    placeId: 'pujol',
    score: 9.4,
    text: 'Flew in for the mole madre. Aged longer than some friendships. A genuine bucket-list plate.',
    platform: 'youtube',
    sourceUrl: 'https://www.youtube.com/@thehungrynomad',
  },
  {
    id: 'cr-4',
    creator: 'Yuki Tanaka',
    handle: '@tokyobites',
    followers: '88k',
    verified: false,
    initials: 'YT',
    color: 'var(--stamp-green)',
    placeId: 'rosetta',
    score: 9.1,
    text: 'The guava concha broke my brain. Reminded me of the best bakeries back home in Tokyo.',
    platform: 'instagram',
    sourceUrl: 'https://www.instagram.com/tokyobites',
  },
  {
    id: 'cr-5',
    creator: 'Ana Sol',
    handle: '@anasolcomes',
    followers: '340k',
    verified: true,
    initials: 'AS',
    color: 'var(--sun-500)',
    placeId: 'orinoco',
    score: 9.0,
    text: 'Northern-style, 2am, that chicharrón crunch on camera got me a million views. Deserved.',
    platform: 'tiktok',
    sourceUrl: 'https://www.tiktok.com/@anasolcomes',
  },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
