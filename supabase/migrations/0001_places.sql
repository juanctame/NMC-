-- CRTQ shared places cache
-- ─────────────────────────
-- One central, periodically-swept index of a city's live Google Places
-- restaurants. Every app visitor READS this table (no per-browser Google quota
-- on load); only the scheduled `sweep-places` Edge Function WRITES to it, using
-- the service-role key which bypasses RLS. Clients can never write — so the
-- shared index can't be poisoned by a browser.
--
-- We store Google's RAW fields (types, price_level, vicinity, photo refs, …) and
-- derive the app's display fields (cuisine, hood, price, blurb, photo URLs)
-- CLIENT-SIDE in src/data/placesCache.ts — the same mapping the live sweep uses,
-- so cached and live venues look identical. This also keeps us compliant: we
-- cache the lightweight place record we're allowed to, not re-hosted photos
-- (those are fetched live through the `place-photo` proxy, with attribution).

create table if not exists public.places (
  id           text primary key,          -- raw Google place_id (client prefixes "g-")
  city_id      text not null,             -- CRTQ city, e.g. "cdmx"
  name         text not null,
  gtypes       text[],                    -- Google Places `types` (mapped to cuisine client-side)
  price_level  int,                       -- Google 0–4 (→ $ … $$$$)
  vicinity     text,                      -- Google short address (→ hood client-side)
  lat          double precision,
  lon          double precision,
  rating       real,                      -- Google 0–5 community rating
  reviews      int,                       -- Google review count
  photo_ref    text,                      -- hero photo_reference (served via place-photo proxy)
  photo_refs   text[],                    -- a few more refs for the gallery
  photo_attr   text,                      -- required photo attribution (plain text)
  open_now     boolean,                   -- snapshot from sweep time (advisory only)
  updated_at   timestamptz default now()  -- last time the sweep touched this row
);

-- Fast per-city reads, best venues first.
create index if not exists places_city_idx    on public.places (city_id);
create index if not exists places_city_rank_idx on public.places (city_id, rating desc nulls last, reviews desc nulls last);

-- Row-level security: the world may READ the shared index; nobody may write with
-- the public anon key. The sweep function uses the service-role key, which
-- bypasses RLS, so it can upsert while clients stay read-only.
alter table public.places enable row level security;

drop policy if exists "places are public read" on public.places;
create policy "places are public read" on public.places
  for select using (true);
-- (Intentionally NO insert/update/delete policy for anon — writes are
--  service-role only.)
