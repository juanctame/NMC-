# Google Places — full-city coverage & real photos

The map/feed fill with **real, current Google Maps restaurants** for the selected
city, each showing its **actual Google Maps photo**. This is fetched live at
runtime — the app does not ship a stored list of restaurants or copies of their
photos.

## How coverage is maximized (`src/data/placesGoogle.web.ts`)
Google's Nearby Search returns at most ~60 places per query (3 pages of 20)
around a single point — one search only "sees" one neighborhood. To cover the
whole city we **tile it into a grid** of search points, page through each, and
**dedupe by `place_id`**:

- `GRID × GRID` search points spread across `SPAN` degrees, centered on the city
- each point searched at `RADIUS` metres, paged `MAX_PAGES` deep
- results merged and de-duplicated → **hundreds of live venues** instead of ~20

Defaults (central CDMX, cranked): `GRID=6` (36 points), `SPAN≈0.16°` (~17 km),
`RADIUS=2400 m`, `MAX_PAGES=3` (up to 60/point) → often **1,000+ live venues**.
Turn `GRID`/`MAX_PAGES` up for more of the city (and more API calls), down to
spend less quota. The sweep is **progressive** — results stream into the map/feed
as each batch of points lands (via `onPartial`), so you see venues within a
couple of seconds — and runs **once per city per session** (the store caches
`nearby` until you change city).

## Ideal recommendations (`src/data/recommend.ts`)
The Feed's **"Ideal for you"** rail ranks the live venues for the signed-in
foodie by `quality × taste fit`:

- **Quality** — a Bayesian-smoothed Google rating, so a 5.0 with 3 reviews never
  outranks a 4.6 with 4,000.
- **Taste fit** — the venue's cuisine scored against the user's palate axes +
  their chosen tastes (the same palate engine that powers the profile).
- Small nudges for corroboration (review volume), open-now, and novelty
  (want-to-try, and never re-recommending somewhere already in your log).

Each pick shows a 0–100 "for you" score and short reason tags ("Right up your
Seafood alley", "Beloved by thousands", "A hidden gem", "Open now").

## Photos
Each venue's photo comes from Google's own Places Photo endpoint via
`photo.getUrl({maxWidth,maxHeight})`, stored as `place.photoUrl` and rendered
live (`placePhoto()` in `src/assets.ts`) on the Feed cards, the place hero +
gallery, and the map card — with the required **attribution** shown over the
hero. Photos are never downloaded or re-hosted.

## Place profiles — everything to know before you go
Opening a venue fetches **live Google Place Details**
(`getPlaceDetails` in `src/data/placesGoogle.web.ts`, behind the provider's
`getDetails`) and enriches the profile (`src/screens/PlaceDetail.tsx`) with:
- **At-a-glance** chips (rating + volume, price tier, open-now, cuisine).
- **The lowdown** — Google's own editorial summary, when it has one.
- **The draw / Good to know** — honest pros & caveats *derived from real
  signals* (rating, review volume, price, open state, taste fit). Nothing is
  invented (`drawAndKnow` in `src/data/placeDetails.ts`).
- **Your taste match** — the venue scored against the signed-in foodie's palate.
- **Plan your visit** — full weekly hours (today highlighted) + one-tap Call,
  Website, Directions.
- **From Google** — up to 5 real Google reviews, shown verbatim with attribution.

Details are fetched **once per place per session** and never stored. Cost note:
each place-open is one Place Details request (Contact + Atmosphere fields,
roughly $0.02 combined on the Basic/Contact/Atmosphere SKUs) — modest and
user-initiated, unlike a bulk sweep. Native builds show the base profile only
(Place Details is web-only, like the rest of the Places JS library).

## What to order & bang for your buck
Each profile also helps you *decide*:
- **What to order** — three suggested plans (a quick solo hit, "the move" = a
  balanced start→finish **optimal plan**, and a shareable spread), each with an
  **estimated price** in the city's currency. Combos come from a per-cuisine kit
  priced off the venue's tier (`src/data/combos.ts`) and are anchored on the
  community's table-favourite dish when there is one. These are clearly flagged
  **estimates** — Google serves no menu, so nothing here is presented as a real
  one.
- **Bang for your buck** — a value ladder that ranks the venue against
  same-cuisine, similar-priced neighbours already loaded, by **quality-per-dollar**
  (Google rating ÷ price tier). You see where it lands ("Nº 2 of 9"), a verdict,
  and — when one exists — a cheaper spot that's just as loved. This part is built
  entirely from real rating/price data.

## Build your passport from photos (onboarding)
New users can register where they've already been straight from their camera
roll. The photo picker reads each image's **EXIF GPS tag in the browser**
(`src/data/photoImport.web.ts` — nothing is uploaded; photos never leave the
device), the store dedupes nearby points and asks the provider's `findNearest`
for the restaurant at each coordinate (`rankBy: DISTANCE`, with a ~180 m cutoff
so non-dining photos are dropped), and the user confirms which matches to add.
Confirmed spots land in the log with a provisional score from Google's rating
(flagged `provisional`, re-rankable anytime) and stay resolvable via a module
registry even after a city reload. Entry points: the **Guide** screen and the
onboarding house-rules step. Web-only (needs the Places JS library + a file
picker); native is a graceful no-op until expo-media-library is added.

## What this is *not* (and why)
- **Not "every single restaurant" as a shipped dataset.** Google has no
  "list all" endpoint (Nearby Search caps at 60/query), and the Google Maps
  Platform Terms prohibit bulk-harvesting and permanently storing their places
  database. So there is no hardcoded file of all CDMX venues — the app pulls as
  many as Google will legitimately return, live, and dedupes them.
- **Not exported/re-hosted photos.** Maps photos are owned by their contributors
  and Google's Terms forbid downloading/redistributing them. We display them
  live from Google with attribution instead.

## Turning it on
Needs the **Places API** + **Maps JavaScript API** enabled on the browser key in
`src/config.ts` (referrer-restricted to the site). When the key/API is reachable
the city fills with live venues + real photos; when it isn't, the app falls back
to the offline CDMX sample so nothing breaks. Native builds use OpenStreetMap
(the Places JS library is web-only).

### Quota note
Each grid point/page is one Nearby Search request (~$32 / 1,000 on the Basic
tier). Defaults ≈ 16–32 requests per city load, once per session. Dial `GRID` /
`MAX_PAGES` to trade coverage for cost.

### Cached backend (recommended for production)
The live per-browser sweep means **every visitor** spends quota. To make it
sustainable, the app can instead read **one shared, pre-swept index** from
Supabase — swept once on a schedule and read by everyone, for near-zero
per-visitor cost. `loadNearby` is **cache-first**: it reads that index and only
falls back to the live browser sweep when the cache is empty/unconfigured. See
**[CACHED_SWEEP.md](CACHED_SWEEP.md)** for the one-time setup (table + two Edge
Functions + nightly job). Photos in the cached path are still fetched **live**
from Google (through a proxy that keeps the server key private), never
re-hosted.
