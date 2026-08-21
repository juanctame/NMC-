# NO MAD CORNER

A community-driven dining app for Mexico City (CDMX). It fuses a Beli-style
**rank-everything-you-eat** engine, social discovery, Playtomic-style **group
table reservations**, a hidden **Dine Club** membership tier, a printed-paper
**Nearby map**, Rotten-Tomatoes-style **dual ratings** (Critics + People), a
community **photo gallery**, and a **trending video reel**.

The visual language is the NO MAD CORNER design system — a vintage travel-sticker
aesthetic: warm cream paper, sun-yellow + vermillion inks, thick black printed
outlines, hard "stamp" offset shadows, and passport-stamp roundels.

Built with **Expo (React Native)** + **TypeScript**, implemented pixel-faithfully
from the high-fidelity design handoff.

---

## Live site & deployment

The web build is public at **<https://juanctame.github.io/NMC-/>**.

Deployment is automated: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
builds the Expo web bundle (`npx expo export -p web`) and publishes it to the
`gh-pages` branch on every push to the app branch, so the site stays current with
no manual step. Pages must be set to serve that branch: **Settings → Pages →
Build and deployment → Source = "Deploy from a branch" → Branch: `gh-pages` /
`(root)`**.

Restaurant data loads live from Google Places, and — once the optional shared
cache is set up — from one server-swept index so visitors don't each spend
Google quota. See **[CACHED_SWEEP.md](CACHED_SWEEP.md)** for that one-time
backend setup (Supabase table + two Edge Functions + nightly sweep).

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57 · React Native 0.86 · React 19 |
| Language | TypeScript (strict) |
| State | Zustand (single store mirroring the design's view-model) |
| Graphics | react-native-svg (icons, printed map, seals) |
| Fonts | Megazoid + Roquen (brand, bundled) · Fraunces, DM Serif Display, Oswald, Space Grotesk, JetBrains Mono (Google) |
| Motion | Core `Animated` (screenIn, stampIn, sheetUp, ken-burns) |
| Safe areas | react-native-safe-area-context |

## Project layout

```
App.tsx                 Font loading + splash + safe-area provider
src/
  Root.tsx              Screen router + tab bar + overlay layer
  theme/                tokens (colors/spacing/shadows) · fonts · typography
  store/                data (all sample records + derived RANK) · useStore (state + rank engine) · helpers
  components/           Sticker, Roundel, Photo, Grain, Segmented, Text, icons, TabBar, MessageCard, Anim
  screens/              Feed, Log, Leaderboard, Passport, PlaceDetail, Onboarding,
                        Table, EventDetail, Ticket, Thread, DineClub, NearbyMap, Reel
  overlays/             RankFlow, AttachSheet, CreateTable
assets/                 brand logo, photos, fonts, app icon + splash
```

## Screens (14)

Feed · Your Log (Been / Want / Recs) · Leaderboard · Passport · Place detail ·
Rank flow (Pick → Bucket → Compare → Result) · The Table (events + community) ·
Create-a-table · Event detail · Ticket · Community thread · Dine Club (hidden) ·
Nearby map · Trending reel · Onboarding.

**Bottom tabs:** Corner · Guide · ⊕ Rank · Table · You.

### Two things to try
- **Rank flow:** tap the center ⊕ (or "Rank it" on any place) → gut-check bucket →
  a couple of "which was better?" comparisons → a stamped 0–10 score that splices
  into your log.
- **Dine Club (hidden):** tap the corner **logo 5× quickly** on the Feed to unlock
  the members-only dark space; a vermillion dot marks it unlocked and a single tap
  re-enters.

---

## Live restaurant data (per city)

Real restaurants + food stalls load for the **selected city** through a
swappable provider layer (`src/data/`), so the app "updates constantly" without
any screen knowing the source:

- **Provider seam** — `PlacesProvider` in `src/data/provider.ts`. Flip
  `DATA_SOURCE` in `src/data/config.ts` (`overpass` \| `fixture` \| `google`).
- **OpenStreetMap / Overpass** (`src/data/osm.ts`) — the shipped default: free,
  keyless, worldwide. `osmNormalize` maps raw OSM elements to the app's `Place`
  shape; endpoints fall back in order, and CDMX degrades to an offline sample if
  the network is down.
- **Google Places** — drops in behind the same interface once
  `GOOGLE_PLACES_API_KEY` is set (adds photos + ratings). Until then it
  transparently uses Overpass.
- **Accurate map** — the Nearby map projects each place's real lat/lon onto the
  selected city's bounding box (`projectToBox`), so pins sit where the
  restaurants actually are. City picker in the Feed + map headers; seed set in
  `src/data/cities.ts` (CDMX, Monterrey, Guadalajara, New York, Tokyo).

OSM carries no photos/ratings, so fresh finds show a brand placeholder photo and
an honest "no verdict yet — be the first to rank it" state. The app's social
layer (Critics-vs-People scores, friends, events, Dine Club) stays app-domain —
no restaurant API provides it.

## Reviews & rankings (Letterboxd-style)

- **Public reviews per place** — every review written in the app is public. On a
  place, reviews sort by **popularity** (likes) with a **Recent** toggle and an
  **Everyone / Friends** audience filter; friend and critic voices are tagged.
  Data + selector in `src/data/reviews.ts` + `reviewsFor()`; write one via the
  composer (`src/overlays/ReviewComposer.tsx`).
- **Restaurant leaderboard** — the Leaderboard screen toggles **Restaurants /
  Diners**. Restaurants ranks the city's places by a blended Critics+People
  score and is **filterable by cuisine**; Diners keeps the friends board.

## Accounts & onboarding (local, for the pilot)

First launch runs an account-creation onboarding so a tester can make a user and
start using the app: cover → **create account** (name, @handle, home city, stamp
colour) → taste picker (≥3) → house rules → an ADMITTED stamp with their new
passport №, into the Feed. The profile **persists on-device** (AsyncStorage →
localStorage on web), so returning testers skip straight in; Passport →
**Sign out** resets it. The identity threads through Passport, the Leaderboard
"You" row, and review authorship.

This is a **local** account (`src/data/profile.ts` + `src/data/storage.ts`),
shaped to swap for real auth: replace the three functions in `storage.ts` with
API calls (email/OAuth + server) and carry a session token.

## One 0–10 scale, creators & trending video

- **Consistent ranking** — every score in the app is the same **0–10** Beli
  scale (the rank engine, Critics, People, friends, creators, reviews) with one
  band set (Loved 8+, Fine 6–7.9, Not it <6) and a verdict word. No percentages
  anywhere (`scoreStyle` + `verdictOf` in `src/store/helpers.ts`).
- **Tastemakers in the Feed** — a strip of featured creator reviews (verified,
  follower counts, 0–10 verdict, link to the clip) modelling the content to
  promote (`src/data/creators.ts`).
- **Trending short-form video** — the Trending corner + reel feature clips from
  **TikTok / Instagram / YouTube** (platform badge, creator, caption, deep-link
  to the post). `src/data/videos.ts` is the shape a real "gather" pipeline fills
  (platform APIs — TikTok Display, Instagram Graph/oEmbed, YouTube Data — or a
  backend aggregator); in-app playback later swaps the deep-link for each
  platform's embed player (WebView / iframe).

## Run it (development)

```bash
npm install
npx expo start          # then press i (iOS), a (Android), or scan in Expo Go
```

Type-check and produce a production JS bundle:

```bash
npx tsc --noEmit
npx expo export --platform ios      # or android
```

## Build for a test pilot (TestFlight / Play internal)

Uses **EAS Build**. Profiles are in `eas.json`.

```bash
npm i -g eas-cli
eas login
eas build:configure                 # first time: links/creates the EAS project

# Internal testers (TestFlight-style ad-hoc / Play internal APK)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Store-track builds
eas build --profile production --platform ios
eas submit  --profile production --platform ios      # -> App Store Connect / TestFlight
eas build --profile production --platform android
eas submit  --profile production --platform android  # -> Play internal testing
```

Identifiers (change to your own org before submitting):
`ios.bundleIdentifier` = `com.nomadcorner.app`, `android.package` = `com.nomadcorner.app`
(in `app.json`).

---

## Fidelity & production notes

This app recreates the design's **look, layout, copy, and interaction** exactly.
The sample data (places, dual critic/people scores + rankings, friends graph,
events, tables, club, map coordinates, threads) is hardcoded in
`src/store/data.ts` and is meant to become API/models.

Before a public release:

- **Photography & video** — the food/place images are design-system stand-ins.
  Replace with licensed CDMX venue photography and real short-form **video** for
  the trending reel.
- **Fonts** — Megazoid and Roquen ship as "Testing/DEMO" files. License the
  production faces before shipping.
- **Photo upload** — "Add yours" currently appends from a local pool (faithful to
  the prototype). Wire `expo-image-picker` + upload, and add the camera/library
  usage strings, when you make it real.
- **Backend** — needs: places; per-place critic vs. people scores + rankings; the
  user's log; friends graph (with mutual-follow); events + RSVPs/tickets; tables
  with visibility; club membership + events + threads; geolocation for the map;
  media upload; a trending feed.
- **Onboarding** — runs on launch (`SKIP_ONBOARDING = false` in
  `src/store/useStore.ts`). Set `true` to open straight on the Feed, or wire
  persistence so it only shows on first run.

The prototype/design source lives in the handoff bundle; `NO MAD CORNER.dc.html`
was the reference for layout, copy, and behavior.
