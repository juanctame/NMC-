# Trial run — real users, fresh data, new spots

This is the runbook for running CRTQ as a public trial: what's built, what you
need to switch on, and how to check it's working.

## Status right now

`supabase/status.json` is rewritten by every run of the **Backend (Supabase)**
workflow. At the last check the project at
`https://psbxxcupbbgwcjzqkygb.supabase.co` **did not resolve** from GitHub's
servers (`ENOTFOUND`), so the project is paused or deleted. Until it answers,
the app runs fully on each device (and says so in *Passport → Ajustes → Trial &
sync*); nothing is lost, and everything syncs once the server is back.

## Switch it on (about 10 minutes, once)

1. **Restore the database.** Open <https://supabase.com/dashboard>. If the
   project is listed as *Paused*, press **Restore**. If it's gone, create a new
   project and paste its **Project URL** and **anon public key** (Settings →
   API) into `src/config.ts` (the anon key is meant to be public).
2. **Give CI a key to build it.** Supabase dashboard → your avatar → **Account
   → Access Tokens → Generate new token**. In GitHub: repo **Settings → Secrets
   and variables → Actions → New repository secret**, name
   `SUPABASE_ACCESS_TOKEN`, paste the token.
3. **Run the backend workflow.** GitHub → **Actions → Backend (Supabase) → Run
   workflow**. It applies every migration in `supabase/migrations/` (all
   idempotent — safe to re-run), turns on **anonymous sign-ins** and adds the
   site to the auth redirect list, then probes everything and commits
   `supabase/status.json`. `"ready": true` there means the trial backend is
   live.
4. *(Optional, for Google sign-in)* follow `AUTH_SETUP.md` §1–2 (Google OAuth
   client → Supabase provider). Anonymous accounts work without it.
5. *(Recommended)* **Merge this branch into `main`.** GitHub only runs
   scheduled workflows from the default branch, so the daily refresh (clips,
   restaurant photos, the city sweep for new spots) starts once the workflows
   are on `main`. Until then, run **Actions → Discover spots** by hand (or push)
   to re-sweep.
6. *(Optional, for many more spots)* Public OpenStreetMap servers are often
   overloaded, so a sweep can take several runs to cover the whole city. A
   Google Places key with billing enabled (GOOGLE_PLACES.md) would add a much
   faster second source.

## What's built

### Real users
- Every person is a real **Supabase Auth user**. The moment someone makes a
  passport, the device signs in anonymously (no form, no password). *Continue
  with Google* keeps the same passport on any device.
- A new passport **starts empty** — the demo list is only for the preview.
- Everything they do is saved on the device instantly (`nmc.mine.v1.<handle>`)
  and sent to the server a moment later: ranked list, want-to-try, follows,
  favourites/Top 4, reviews, their profile. On every launch — and when the app
  comes back after a minute — it pulls the latest from the server and merges
  (so a second device gets the same list).
- **Row-level security**: people can only write their own rows; emails and
  want-to-try lists are private; handles are unique and can't be taken over
  (a pilot passport with no owner can be claimed once; one with an owner comes
  back only through its owner's sign-in).

### Bring your places (import)
When making a passport — its own step (*Bring your places*, step 3 of 4, before
House rules), which also opens the account in the background so everything
brought in is synced the moment the passport is stamped — or any time from the
Guide (*Bring your places*), people can fill their passport from the lists they
already keep. Everything is read on the device; nothing is uploaded.
- **Beli** — screenshots of their Been / Want to Try lists, read in the browser
  (Tesseract OCR, loaded on first use). Names, colonias and the score in each
  ring come through; or paste a copied list.
- **Google Maps** — a Google Takeout export: saved lists (`Saved/*.csv`, *Want
  to go* → want to try), starred places (`Saved Places.json`), reviews
  (`Reviews.json`, stars → score), older Timeline history (only places CRTQ
  knows); or pasted Maps links.
- **Notes / any list** — pasted text or a `.txt`: bullets, numbering,
  checklists (☑ = been, ☐ = want), "9/10", "4.5/5", ★★★★, and headings like
  "Want to try:".
- **Photos** — pick a camera roll's worth of photos (up to 800). Each photo's
  location (EXIF GPS, read on-device) is matched to the places CRTQ knows (the
  guide + every discovered spot), and an on-device **food scan** (TensorFlow.js
  + MobileNet v2, loaded on first use, ~14 MB) checks which photos are meals.
  Photos taken within a few hours and a short walk of each other count as one
  meal (so one drifted photo can't move it next door); meals on different days
  are separate visits. Places with a meal photographed right there, or several
  visits, are ticked as *Been here*; a nearby meal is *Likely*; only non-food
  photos close by is *Maybe* (not ticked). Each match can be switched to the
  next-closest place. Code: `src/data/visits.ts`, `foodScan.web.ts`.
- **Any file** — CSV / JSON with a name column (score, notes, list, coordinates
  picked up), or KML from Google My Maps.

Each entry is matched to a real place (the guide, the discovered spots, nearby)
by name — forgiving accents, "Taquería"/"Restaurante" prefixes and OCR slips —
plus location and colonia when given. The review screen shows every match
(✓ matched, ? best guess with alternatives, + new to CRTQ), Been / Want per
place, and their own scores; imports made during onboarding carry into the new
passport. Code: `src/data/importers.ts`, `placeMatch.ts`, `ocr.web.ts`,
`src/overlays/ImportHub.tsx`.

### The database (`supabase/migrations/0002_trial.sql`)
| table | who reads | who writes |
|---|---|---|
| `profiles` (no email to the public) | everyone | its owner |
| `rankings` — each person's list | everyone | its owner |
| `reviews`, `favorites`, `follows` | everyone | their author |
| `wants` — want-to-try | its owner | its owner |
| `spot_suggestions` — "tell us about a spot" | everyone | signed-in people |
| `feedback`, `client_errors` | the team (dashboard) | the app |
| `app_opens` (via `touch_session()`) | `trial_stats()` totals only | the app |

`trial_stats()` returns the public numbers shown in the app (people, active
today / 7 days, rankings, reviews, spots sent).

### Up-to-date information on every use
- Each deploy stamps a build (`version.json`); an open app checks it at launch
  and on return and offers **Refresh** when a newer build is live.
- Discovered spots are **not baked into the app**: they're published as
  `data/*.json` with each deploy and read fresh on every launch (kept on the
  device for offline use).
- Your own data syncs on launch, on return, and after every change.

### Always finding new spots
`scripts/discover-spots.mjs` runs in its own workflow (**Actions → Discover
spots**: on push of the script, on demand, and daily once on `main`), with a
50-minute budget so slow public map servers never hold up a deploy. It
publishes straight into the live site's `data/`; deploys carry that forward.
Tiles a sweep can't reach keep the previous sweep's spots, and areas reached
for the first time join the baseline (they aren't mislabelled "new"):
1. **OpenStreetMap** — every named restaurant, café, bar, street-food stall,
   bakery… in Mexico City, swept in 9 tiles across 3 Overpass mirrors.
2. **A memory between runs** — `data/spots-ledger.json` (published with the
   site) remembers the day each spot was first seen. A spot that appears after
   the first sweep is *new on the map*. Spots just added to OSM and spots with a
   recent opening date count as new from day one.
3. **The press** — Google News searches about openings in CDMX; a spot named in
   a headline gets *in the news* with the article linked.
4. **Diners** — spots people send from the app (*Know a spot we don't?*) join
   everyone's list on the next sweep; "closed" reports drop a spot.
5. **Pictures** — the photo OSM links, else the preview image from the spot's
   own website (160 sites per run, remembered in `data/spots-media.json`),
   else a Commons photo taken right there whose file name carries its name.

In the app, **Fresh finds** (feed) picks a different hand each visit
(`src/data/discover.ts`): newness + buzz + suggestions + detail, plus your
taste (the cuisines you rank and the tastes you picked), distance (*Near me*,
asks first), minus fatigue for spots you've already been shown, plus a small
per-person daily shuffle. Spots you rank, save or dismiss never come back. When
everything nearby has been seen it widens the radius; when everything has been
seen it starts over — it's never empty and never the same twice in a row.

### Stability
- A crash on one screen shows a way back instead of a blank page, and the
  error (no personal content) goes to `client_errors`, along with uncaught
  errors app-wide.
- Offline / server-down: the app keeps working on the device and says so.
- Every network call has a timeout and fails soft.
- Settings → **Trial & sync**: sync status, *Sync now*, build number, live
  trial numbers, and a feedback box (→ `feedback`).
- The sample friends are labelled *sample diner* wherever they appear.

### The landing reel
The sign-in screen loops HD clips behind the buttons on web
(`src/components/LandingReel.web.tsx`): muted, ~7 s from each clip (past its
intro), crossfading into the next, with the clip's credit along the bottom.
The clips are picked at each deploy by `scripts/collect-landing-reel.mjs` into
`src/data/landingReel.json`: the platform's own restaurant-page clips
(Wikimedia Commons / Internet Archive files) first, then Commons footage of
Mexico City food. Only true HD counts — a ≥720p rendition a browser plays, of a
≥720p original (1080p on big or dense screens). A clip that fails is skipped;
reduced motion or Data Saver shows a still; if nothing plays, the yellow brand
cover shows as before.

### House critics
Real people whose scores are their own, unlike the simulated creator profiles
(`src/data/houseCritics.ts`). The first is **Juan Carlos Tame
([@tametitoeats](https://beliapp.co/app/tametitoeats) on Beli)**: pinned first
in the feed's critics rail and on the critics board, with his own page and his
score on any place he's ranked.
- Beli shows lists only inside its app — the public link returns just his name
  and photo — so his list can't be copied from the web. It goes into
  `src/data/critics/tametitoeats.json` from his Beli screenshots or a copied
  list (read with the same OCR/matching as the import), never made up.
- When he keeps a CRTQ passport as `@tametitoeats` and imports his Beli list
  there (*Bring your places → Beli*), his critic page reads that list live.

## Checking on the trial
- Supabase → **Table editor**: `profiles`, `rankings`, `feedback`,
  `client_errors`, `spot_suggestions`.
- `select public.trial_stats();` in the SQL editor.
- Discovery: `https://juanctame.github.io/NMC-/data/spots-index.json` (counts,
  new, in the news, with photo, when).
