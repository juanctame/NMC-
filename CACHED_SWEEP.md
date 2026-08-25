# Cached places sweep (one shared city index, minimal quota)

By default the app sweeps Google Places **live in each browser** on load
(`src/data/placesGoogle.web.ts`). That's great for a demo but means **every
visitor spends Google quota** — 16–32+ Nearby Search requests each, every time
they open the app. This doc turns on the sustainable version: a **single shared
index** that's swept **once on a schedule** and read by everyone.

```
        ┌───────────── nightly ─────────────┐
Google Places ──▶ sweep-places (Edge Fn) ──▶ Supabase `places` table
                                                     │  (public read)
   every visitor ◀── cache-first read ◀─────────────┘
   photos ◀── place-photo proxy ◀── Google (key stays server-side)
```

- **No per-visitor quota.** The whole app reads one Supabase table; the sweep
  pays Google once per run for everybody.
- **Cache-first, live-fallback.** `loadNearby` reads the table first; if it's
  empty/unconfigured/unreachable it falls back to the live browser sweep, so
  nothing breaks while you set this up (or if you never do).
- **Compliant.** We cache the lightweight place record, not re-hosted photos —
  images are fetched **live** from Google through a proxy, with attribution.

Everything degrades to a safe no-op until you complete the steps below.

---

## 1. Create the table
In your Supabase project's **SQL Editor**, run
[`supabase/migrations/0001_places.sql`](supabase/migrations/0001_places.sql).
It creates `public.places` with **public read** RLS and **no client write** —
only the sweep (service-role) writes.

## 2. Get a server key for Google
The browser key in `src/config.ts` is referrer-locked and can't be used from a
server. Create a **second** key for the sweep:

1. Google Cloud console → **APIs & Services → Credentials → Create credentials →
   API key**.
2. **API restrictions →** allow **Places API** (the web-service one).
3. **Application restrictions →** leave as *None* (it's called server-to-server).
   Keep this key **secret** — it never goes in the app, only in Supabase secrets.

## 3. Deploy the Edge Functions
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then (this
project's ref is **`psbxxcupbbgwcjzqkygb`**, from the `SUPABASE_URL` in
`src/config.ts`):

```bash
supabase login
supabase link --project-ref psbxxcupbbgwcjzqkygb

# secrets (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)
supabase secrets set GOOGLE_SERVER_KEY=<the server key from step 2>
supabase secrets set SWEEP_SECRET=<a long random string you invent>

# the writer (JWT-verified: only callers with the secret can run it)
supabase functions deploy sweep-places

# the photo proxy (PUBLIC: an <img> tag can't send an auth header)
supabase functions deploy place-photo --no-verify-jwt
```

## 4. Fill the cache once
Run these from a shell (swap in the `SWEEP_SECRET` you chose above):

```bash
SUPABASE_URL=https://psbxxcupbbgwcjzqkygb.supabase.co
SWEEP_SECRET=<the string you set in step 3>

for CITY in cdmx mty gdl nyc tyo; do
  curl -X POST "$SUPABASE_URL/functions/v1/sweep-places?city=$CITY" \
       -H "x-sweep-secret: $SWEEP_SECRET"
  echo
done
# each → {"city":"cdmx","points":36,"found":1200,"upserted":1200}
```

## 4b. Confirm it worked
- **Data landed:** `curl "$SUPABASE_URL/rest/v1/places?select=count" -H "apikey: <anon key>"`
  should report a non-zero count (the anon key is the public one in `src/config.ts`).
- **App reads it:** reload <https://juanctame.github.io/NMC-/> — the venues now
  load instantly with **no Google calls in the browser** (check the Network tab),
  and the **"shared index · updated …"** chip appears on the feed's *Fresh near
  you* header and the map. That chip is your live proof the cache is serving.

## 5. Keep it fresh automatically
Pick either scheduler:

**GitHub Actions (included).** Add two repo secrets (Settings → Secrets and
variables → Actions):
- `SUPABASE_URL` = `https://psbxxcupbbgwcjzqkygb.supabase.co`
- `SWEEP_SECRET` = the same string you set in step 3

The workflow [`.github/workflows/sweep-places.yml`](.github/workflows/sweep-places.yml)
then sweeps all five cities nightly (and on-demand from the Actions tab). Without
the secrets it's a harmless no-op.

**Supabase pg_cron** (alternative, all in-database):
```sql
select cron.schedule('sweep-cdmx', '20 8 * * *', $$
  select net.http_post(
    url    := 'https://psbxxcupbbgwcjzqkygb.supabase.co/functions/v1/sweep-places?city=cdmx',
    headers:= '{"x-sweep-secret":"<SWEEP_SECRET>"}'::jsonb
  );
$$);
```

---

## How the pieces map to the code
| Piece | File | Role |
|------|------|------|
| Table | `supabase/migrations/0001_places.sql` | shared index, public-read RLS |
| Sweep | `supabase/functions/sweep-places/index.ts` | grid Nearby Search → upsert (service role) |
| Photo proxy | `supabase/functions/place-photo/index.ts` | `photo_reference` → keyless Google redirect |
| Client read | `src/data/placesCache.ts` | `fetchCachedPlaces(cityId)` + `photoProxy(ref)` |
| Cache-first | `src/store/useStore.ts` `loadNearby` | read cache → else live sweep |
| Scheduler | `.github/workflows/sweep-places.yml` | nightly refresh |

The sweep stores Google's **raw** fields; the client derives the display shape
(cuisine, hood, price, blurb, photo URLs) with the **same** mapping the live
sweep uses, so cached and live venues are identical. Tune coverage vs. cost with
the sweep's `?grid=` / `?pages=` / `?radius=` query params (defaults mirror the
live sweep: 6×6 grid, 3 pages, 2.4 km).

## Cost
One nightly run ≈ `grid² × pages` Nearby Search requests **per city** (~108 for
CDMX at defaults), shared across **all** visitors — versus the live path's
16–32+ requests **per visitor per load**. At Google's Basic tier (~$32/1,000)
that's roughly a few cents a day for the whole app.
