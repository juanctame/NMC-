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
   are on `main`. Until then, every push re-deploys with fresh data.

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
`scripts/discover-spots.mjs` runs on every deploy (a full sweep at most every
20 h; in between it re-publishes the last one):
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

## Checking on the trial
- Supabase → **Table editor**: `profiles`, `rankings`, `feedback`,
  `client_errors`, `spot_suggestions`.
- `select public.trial_stats();` in the SQL editor.
- Discovery: `https://juanctame.github.io/NMC-/data/spots-index.json` (counts,
  new, in the news, with photo, when).
