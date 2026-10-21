-- CRTQ trial run — real users, their data, and the community layer
-- ─────────────────────────────────────────────────────────────────
-- Every person is a real Supabase Auth user: a device signs in anonymously on
-- first launch (no form, no password) and can later link Google to keep the
-- same account across devices. Everything a person writes is keyed on that
-- user (auth.uid()), and row-level security only lets them write their own
-- rows. Public profile data (handle, name, avatar, rankings, reviews,
-- favourites) is readable by everyone; emails, want-lists, feedback and error
-- reports are not.
--
-- Idempotent: safe to run again (CI applies every migration on each backend
-- deploy). Folds in the tables SHARED_DEMO.md / AUTH_SETUP.md asked for by hand.

create table if not exists public.schema_migrations (
  version    text primary key,
  applied_at timestamptz default now()
);
alter table public.schema_migrations enable row level security; -- internal: no public access

-- ── profiles: the public directory of people ────────────────────────────────
create table if not exists public.profiles (
  handle       text primary key,        -- unique username, e.g. "@june"
  name         text not null,
  city_id      text,
  initials     text,
  color        text,
  passport_no  int,
  joined       text,
  role         text default 'nomad',
  beat         text,
  followers    int,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.profiles
  add column if not exists user_id      uuid,
  add column if not exists email        text,
  add column if not exists avatar_url   text,
  add column if not exists bio          text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists app_version  text;
create unique index if not exists profiles_user_uidx on public.profiles (user_id) where user_id is not null;
create index if not exists profiles_email_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;
drop policy if exists "profiles are public read"  on public.profiles;
drop policy if exists "anyone can claim a handle" on public.profiles;
drop policy if exists "anyone can update a handle" on public.profiles;
drop policy if exists "profiles: read"            on public.profiles;
drop policy if exists "profiles: create own"      on public.profiles;
drop policy if exists "profiles: update own"      on public.profiles;
drop policy if exists "profiles: delete own"      on public.profiles;
create policy "profiles: read"       on public.profiles for select using (true);
create policy "profiles: create own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
-- A pilot passport made before accounts existed (no user yet) can be claimed once.
create policy "profiles: update own" on public.profiles for update to authenticated
  using (user_id = auth.uid() or user_id is null) with check (user_id = auth.uid());
create policy "profiles: delete own" on public.profiles for delete to authenticated using (user_id = auth.uid());

-- Emails are private: the public roles may read every column but that one.
revoke select on public.profiles from anon, authenticated;
grant select (handle, name, city_id, initials, color, passport_no, joined, role, beat, followers,
              created_at, updated_at, user_id, avatar_url, bio, last_seen_at, app_version)
  on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;

-- ── reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          text primary key,
  place_id    text not null,
  author      text not null,
  initials    text,
  color       text,
  score       numeric,
  text        text,
  dish        text,
  dish_photo  text,
  critic      boolean default false,
  created_at  timestamptz default now()
);
alter table public.reviews
  add column if not exists user_id uuid default auth.uid(),
  add column if not exists handle  text;
create index if not exists reviews_place_idx on public.reviews (place_id, created_at desc);
create index if not exists reviews_user_idx  on public.reviews (user_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews are public read" on public.reviews;
drop policy if exists "anyone can add a review"  on public.reviews;
drop policy if exists "reviews: read"            on public.reviews;
drop policy if exists "reviews: write own"       on public.reviews;
drop policy if exists "reviews: edit own"        on public.reviews;
drop policy if exists "reviews: delete own"      on public.reviews;
create policy "reviews: read"       on public.reviews for select using (true);
create policy "reviews: write own"  on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "reviews: edit own"   on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews: delete own" on public.reviews for delete to authenticated using (user_id = auth.uid());
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

-- ── favourites (Biggest fans + Top 4) ───────────────────────────────────────
create table if not exists public.favorites (
  id          bigint generated always as identity primary key,
  handle      text not null,
  name        text not null,
  initials    text,
  color       text,
  avatar_url  text,
  place_id    text not null,
  category    text not null,
  featured    boolean default false,
  created_at  timestamptz default now()
);
alter table public.favorites add column if not exists user_id uuid default auth.uid();
create index if not exists favorites_place_idx  on public.favorites (place_id);
create index if not exists favorites_handle_idx on public.favorites (handle);
create index if not exists favorites_user_idx   on public.favorites (user_id);

alter table public.favorites enable row level security;
drop policy if exists "favorites are readable by anyone" on public.favorites;
drop policy if exists "testers can add favorites"        on public.favorites;
drop policy if exists "testers can replace their own"    on public.favorites;
drop policy if exists "favorites: read"                  on public.favorites;
drop policy if exists "favorites: write own"             on public.favorites;
drop policy if exists "favorites: delete own"            on public.favorites;
create policy "favorites: read"       on public.favorites for select using (true);
create policy "favorites: write own"  on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites: delete own" on public.favorites for delete to authenticated using (user_id = auth.uid());
grant select on public.favorites to anon, authenticated;
grant insert, delete on public.favorites to authenticated;

-- ── rankings: each person's ranked list (public, like their passport) ───────
create table if not exists public.rankings (
  user_id     uuid not null default auth.uid(),
  place_id    text not null,
  place_name  text,                       -- denormalised so a list reads without the guide
  score       numeric,
  position    int,
  category    text,
  updated_at  timestamptz default now(),
  primary key (user_id, place_id)
);
create index if not exists rankings_place_idx on public.rankings (place_id);
alter table public.rankings enable row level security;
drop policy if exists "rankings: read"       on public.rankings;
drop policy if exists "rankings: write own"  on public.rankings;
drop policy if exists "rankings: edit own"   on public.rankings;
drop policy if exists "rankings: delete own" on public.rankings;
create policy "rankings: read"       on public.rankings for select using (true);
create policy "rankings: write own"  on public.rankings for insert to authenticated with check (user_id = auth.uid());
create policy "rankings: edit own"   on public.rankings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rankings: delete own" on public.rankings for delete to authenticated using (user_id = auth.uid());
grant select on public.rankings to anon, authenticated;
grant insert, update, delete on public.rankings to authenticated;

-- ── wants: the want-to-try list (private) ───────────────────────────────────
create table if not exists public.wants (
  user_id    uuid not null default auth.uid(),
  place_id   text not null,
  created_at timestamptz default now(),
  primary key (user_id, place_id)
);
alter table public.wants enable row level security;
drop policy if exists "wants: own" on public.wants;
create policy "wants: own" on public.wants for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.wants to authenticated;

-- ── follows ─────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  user_id    uuid not null default auth.uid(),  -- the follower
  followee   text not null,                    -- the @handle they follow
  created_at timestamptz default now(),
  primary key (user_id, followee)
);
create index if not exists follows_followee_idx on public.follows (followee);
alter table public.follows enable row level security;
drop policy if exists "follows: read"       on public.follows;
drop policy if exists "follows: write own"  on public.follows;
drop policy if exists "follows: delete own" on public.follows;
create policy "follows: read"       on public.follows for select using (true);
create policy "follows: write own"  on public.follows for insert to authenticated with check (user_id = auth.uid());
create policy "follows: delete own" on public.follows for delete to authenticated using (user_id = auth.uid());
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- ── spot suggestions: people telling us about a new (or closed) spot ────────
-- The discovery pipeline reads these on every run and folds them into the
-- city's spot list, so what diners find reaches everyone.
create table if not exists public.spot_suggestions (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid(),
  handle     text,
  kind       text not null default 'new' check (kind in ('new', 'closed', 'moved', 'photo')),
  name       text not null check (char_length(name) between 2 and 120),
  place_id   text,                      -- when it's about a spot we already list
  lat        double precision,
  lon        double precision,
  hood       text,
  link       text,                      -- their site / Instagram / a map link
  note       text check (note is null or char_length(note) <= 500),
  city_id    text default 'cdmx',
  created_at timestamptz default now()
);
create index if not exists spot_suggestions_recent_idx on public.spot_suggestions (created_at desc);
alter table public.spot_suggestions enable row level security;
drop policy if exists "suggestions: read"      on public.spot_suggestions;
drop policy if exists "suggestions: write own" on public.spot_suggestions;
create policy "suggestions: read"      on public.spot_suggestions for select using (true);
create policy "suggestions: write own" on public.spot_suggestions for insert to authenticated with check (user_id = auth.uid());
grant select on public.spot_suggestions to anon, authenticated;
grant insert on public.spot_suggestions to authenticated;
grant usage, select on sequence public.spot_suggestions_id_seq to authenticated;

-- ── feedback + crash reports (write-only for the public) ────────────────────
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid(),
  handle      text,
  text        text not null check (char_length(text) between 1 and 2000),
  screen      text,
  app_version text,
  created_at  timestamptz default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback: send" on public.feedback;
create policy "feedback: send" on public.feedback for insert to authenticated with check (user_id = auth.uid());
grant insert on public.feedback to authenticated;
grant usage, select on sequence public.feedback_id_seq to authenticated;

create table if not exists public.client_errors (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid(),
  message     text not null check (char_length(message) <= 1000),
  stack       text check (stack is null or char_length(stack) <= 6000),
  screen      text,
  app_version text,
  user_agent  text,
  created_at  timestamptz default now()
);
create index if not exists client_errors_recent_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
drop policy if exists "errors: report" on public.client_errors;
create policy "errors: report" on public.client_errors for insert to anon, authenticated with check (true);
grant insert on public.client_errors to anon, authenticated;
grant usage, select on sequence public.client_errors_id_seq to anon, authenticated;

-- ── daily activity: who opened the app today (for the trial's numbers) ──────
create table if not exists public.app_opens (
  user_id     uuid not null,
  day         date not null default current_date,
  opens       int  not null default 1,
  app_version text,
  primary key (user_id, day)
);
alter table public.app_opens enable row level security;
-- No direct access: written through touch_session(), read through trial_stats().

-- ── functions ───────────────────────────────────────────────────────────────

-- The signed-in person's own profile (by user, else by their Google email, so a
-- pilot passport registered with that email comes back on first sign-in).
create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles
   where user_id = auth.uid()
      or (user_id is null and email is not null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
   order by (user_id = auth.uid()) desc nulls last
   limit 1;
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Record an app open: bumps today's count and the profile's last-seen time.
create or replace function public.touch_session(p_version text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.app_opens (user_id, day, opens, app_version)
       values (auth.uid(), current_date, 1, p_version)
  on conflict (user_id, day) do update set opens = public.app_opens.opens + 1, app_version = excluded.app_version;
  update public.profiles set last_seen_at = now(), app_version = coalesce(p_version, app_version) where user_id = auth.uid();
end;
$$;
revoke all on function public.touch_session(text) from public, anon;
grant execute on function public.touch_session(text) to authenticated;

-- Trial numbers anyone may see (no personal data): people, activity, content.
create or replace function public.trial_stats()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'people',        (select count(*) from public.profiles),
    'active_today',  (select count(*) from public.app_opens where day = current_date),
    'active_7d',     (select count(distinct user_id) from public.app_opens where day > current_date - 7),
    'rankings',      (select count(*) from public.rankings),
    'reviews',       (select count(*) from public.reviews),
    'suggestions',   (select count(*) from public.spot_suggestions),
    'as_of',         now()
  );
$$;
grant execute on function public.trial_stats() to anon, authenticated;

insert into public.schema_migrations (version) values ('0002_trial') on conflict do nothing;
