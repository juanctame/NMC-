# CDMX demo dataset — the "Carte" guide

The CDMX experience is powered by a **curated, sourced dataset of 166 real
restaurants** (`src/data/carte.ts`), not a live API, so the demo is full, rich,
and up to date the moment it loads — on the feed, the map, the recommendations,
and every profile.

## Where it comes from
`src/data/carte.ts` is **auto-generated** from the source workbook
`Carte_Abhyad_Restaurantes_CDMX.xlsx`, which compiles:

- **Guía Michelin 2026** (stars, Bib Gourmand, selected) + the new 2026 stars
- **The World's / Latin America's 50 Best 2025**
- **Guía México Gastronómico 2026**
- **INEGI · DENUE 05/2026** (official address, coordinates, phone)

Each venue carries: name, guide category, price tier + **per-person ticket
(MXN)**, neighbourhood/alcaldía, address, chef, a written review, **what to
order (real dishes)**, an insider tip, the ideal occasion, Instagram, website,
phone, coordinates, the "moment" (Apertura 2026 · En ascenso · Vigente ·
Trayectoria), and **awards**.

## How it's used
- **Feed** — a "New & rising" rail (2026 openings + newly acclaimed) plus the
  usual "Ideal for you" and "Fresh near you" rails, all drawn from the set.
- **Map** — real coordinates (134/166) plot on the printed-paper map (the CDMX
  bounds were widened to fit the spread).
- **Profiles** — a dark **"From the guide"** card (awards, chef, why-now,
  occasion, insider tip), a **What to order** section built from the guide's
  **real dishes + real per-person MXN**, and a **Bang for your buck** value
  ladder across same-cuisine, similar-priced peers.
- **Real photos** — when a curated venue is opened on the web, the app resolves
  its **live Google Maps twin by coordinate** and shows that venue's **real
  Google photos** (hero + gallery), with attribution and live Google hours /
  reviews. In addition — and with **no API key** — it pulls freely-licensed
  photos from **Wikipedia + Wikimedia** (`src/data/wikiPhotos.ts`): a photo of
  the restaurant for well-known venues, the **chef's portrait** on chef profiles,
  and **reference plates** (a real photo of each recognised dish) in *What to
  order*. These load straight in the visitor's browser via the CORS-friendly
  MediaWiki API, are shown with attribution, and are never re-hosted. Anything
  without a match keeps the generated cover — so coverage grows but nothing ever
  looks broken.
- **Chef profiles** — every venue that credits a chef or kitchen team links to a
  **chef profile** (`src/data/chefs.ts`, derived at runtime). When the guide
  credits the **same** chef at more than one restaurant — Lucho Martínez (Em ·
  Martínez · Ultramarinos Demar), Enrique Olvera (Pujol · Pujol.itto), Edgar
  Núñez, Eduardo "Lalo" García, … — those venues gather under **one** profile
  (matched on an accent- and nickname-insensitive key). A feed rail ("The chefs
  behind it") surfaces them.
- **Pictures from every kind of source** — each restaurant's gallery merges, best
  first: live Google Maps photos (with a Places key); the restaurant's **own
  website**; **guide & press pages about the venue** (Time Out, Chilango, Food and
  Pleasure, El Financiero, N+…); a Wikipedia photo / Commons files named after it;
  photos **geotagged around the corner** (Commons, labelled with the distance);
  and its **neighbourhood's** photo (labelled). Every picture carries its credit
  and a link back, and anything that fails to load is dropped silently — so every
  restaurant has a real visual presence, never a broken one.
  - Site / guide / press images come from `src/data/media.json`, collected in CI
    by `scripts/collect-media.mjs` (the deploy workflow refreshes it weekly, on a
    version bump, or on demand). It reads each page's own link-preview image
    (og:image / twitter:image / JSON-LD), validates it, and for a restaurant's
    own site falls back to the first real photo on the page. Images are
    hot-linked with credit, never re-hosted. Roundup articles appear as press
    cards but their image is never used as the venue's own photo. Guía Michelin
    answers automated requests with a bot challenge, so its listings show as
    links without a picture; Instagram is linked (its image URLs expire and
    can't be embedded).
- **Creator clips, played in the app** — each restaurant's hashtag (e.g.
  `#Pujol`) and name find YouTube clips, kept only if they are **about the
  venue**, posted by **third-party creators** (never the restaurant's own channel
  / Instagram handle / website, nor its chef) and **high quality** (HD,
  embeddable, public, 10 s–20 min, real views); the rest are ranked by reach,
  like ratio, recency and short-form (`src/data/clipRank.ts`). They play inside
  the app through YouTube's privacy-enhanced embedded player — on the place's
  Media tab, in "Trending now", and in a full-screen in-app reel — and nothing
  redirects out. (Platforms don't offer downloadable MP4s; their official embed
  players stream the video in place.) Clips are collected in CI into
  `src/data/videos.json` (`scripts/collect-videos.mjs`, within the YouTube API's
  free daily quota), with a cached live search as fallback. **Requires the
  "YouTube Data API v3" to be enabled on the Google Cloud project of the site's
  key**; until then the sections stay hidden rather than showing placeholders.
- **Clips (TikTok-style), beside the map** — a full-screen vertical feed of
  those creator clips, opened from the button next to the map in the feed
  header or the Map | Clips switch on the map (`src/screens/Clips.tsx`). One
  clip per screen; swipe for the next; only the clip on screen plays (muted until
  you turn sound on, looping, tap to pause). Every clip is **pinned to its
  restaurant** — name, neighbourhood, award, price and hashtag — which opens it;
  the rail saves the restaurant to want-to-try or likes the clip. Consecutive
  clips come from different restaurants; "Watch as feed" on a restaurant's
  Creator clips starts with that restaurant. Back always returns to where you
  opened it.
- **A calmer place page** — a swipeable, credited photo hero, a compact header
  (key chips + a collapsible blurb), and sticky tabs: **Overview** (the guide
  card, the draw / good to know, taste match), **Menu** (what to order,
  reference plates, bang for your buck), **Media** (all photos, in the press,
  social, community photos, videos), **Reviews**, **Visit** (hours, contact,
  maps, booking). Nothing was removed — it's just one section at a time.
- **Restaurant groups** — `src/data/groups.ts` gathers the venues the guide
  itself ties together into **group profiles**, the same way chefs are linked.
  Signals, all from the guide's own text/data: a named group ("del **Grupo
  Castellano**", "(**Grupo Casamata**)", "del grupo Pujol"), sister/parent
  statements ("hermano de Rosetta y Lardo", "del equipo de Hugo Wine Bar", "de
  los creadores de Choza", "por los chefs de Siembra Comedor", "segundo proyecto
  de la chef de Cana"), "el grupo tiene otras sedes como…", a "(grupo)" chef
  credit, and a shared official website. That yields 12 groups — e.g. Grupo
  Casamata (Pujol · Pujol.itto · Molino El Pujol), Grupo Castellano (Vega ·
  Centro Castellano · Torre de Castilla), and families like Rosetta (+ Lardo) and
  El Tigre Silencioso (+ Fauna). Plain name mentions don't count (Em's blurb
  mentions "Martínez" only as the chef's surname), nor do branches of one
  restaurant. Each profile shows the guide's own words as evidence, links the
  chefs involved, and lists sister venues the guide names but doesn't review.
  Groups the guide doesn't name are described by their flagship ("Rosetta
  family") rather than given an invented company name.
- **Brand marks** — each venue and chef carries an original **monogram** seal
  (initials on a deterministic colour, in the app's sticker look). These are our
  own marks, not the restaurants' trademarked logos, so they're safe to ship and
  render offline.
- **Ranking** — because the guide has no Google star, quality comes from
  `acclaim` (0–100), a prestige index derived from the **real awards** (Michelin
  tier, 50 Best, guide mentions). We never fabricate a Google rating; profiles
  show a **Michelin / 50 Best badge** instead of a star.

## Regenerating
The dataset is generated by a one-off script (kept with the source workbook).
It maps the Spanish guide categories to the app's broad cuisine vocabulary for
filters/recommendations while preserving the original category for display,
derives `acclaim` from the awards text, parses "Qué pedir" into a dish list, and
assigns a stock photo per venue (the workbook has no images). To refresh, re-run
that script against an updated workbook and rebuild.

> The workbook ships no images, so on the web each venue pulls its **real Google
> Maps photos** live (by coordinate match, with attribution — never stored); the
> bundled stock pool is only the offline/no-key fallback. Everything else
> (dishes, prices, chefs, awards, coordinates) is real.
