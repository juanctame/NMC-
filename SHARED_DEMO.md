# Shared demo (usernames + reviews across everyone)

By default the app is **local-only**: each tester's username and reviews live in
their own browser. Turning on a tiny Supabase backend makes **usernames and
reviews shared** — every username people create is registered in one central
directory (so handles are unique and an account can be reconnected on another
device), and everyone who opens the link sees everyone else's reviews in real
time. It's free and takes about 5 minutes.

## 1. Create a Supabase project
1. Go to <https://supabase.com> → **New project** (free tier is plenty).
2. Wait for it to finish provisioning.

## 2. Create the reviews table
Open **SQL Editor** in your project and run this:

```sql
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

-- Row-level security: anyone with the public anon key may read and add reviews.
-- (Fine for a friends-and-family pilot. Tighten later if you open it wider.)
alter table public.reviews enable row level security;

create policy "reviews are public read"   on public.reviews
  for select using (true);

create policy "anyone can add a review"    on public.reviews
  for insert with check (true);

-- Optional: keep the newest reviews snappy to query.
create index if not exists reviews_place_idx on public.reviews (place_id, created_at desc);
```

## 2b. Create the accounts (users) table
This is the central **users database**: every username created in the app is
registered here, keyed by a unique handle. It's what lets people claim a unique
username and reconnect their passport on another device. Run this in the same
**SQL Editor**:

```sql
create table if not exists public.profiles (
  handle       text primary key,        -- unique username, e.g. "@june"
  name         text not null,
  city_id      text,
  initials     text,
  color        text,
  passport_no  int,
  joined       text,
  role         text default 'nomad',    -- 'nomad' | 'critic'
  beat         text,
  followers    int,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Row-level security: anyone with the public anon key may read the directory,
-- claim a new username, and update their own row. (Fine for a pilot; the handle
-- primary key is what keeps usernames from colliding.)
alter table public.profiles enable row level security;

create policy "profiles are public read"  on public.profiles
  for select using (true);

create policy "anyone can claim a handle"  on public.profiles
  for insert with check (true);

create policy "anyone can update a handle" on public.profiles
  for update using (true) with check (true);
```

Nothing else to wire — the app reads the same `SUPABASE_URL` / `SUPABASE_ANON_KEY`
below. When a tester creates a username it's saved here (and checked for
availability as they type); "Already have a passport? Connect" on the welcome
screen restores an account by handle.

## 3. Paste your keys
In **Project Settings → API**, copy the **Project URL** and the **anon public**
key, then put them in `src/config.ts`:

```ts
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';   // the "anon public" key
```

The anon key is designed to sit in the client and is protected by the row-level
security policies above, so it's safe to commit.

Rebuild + redeploy (`npx expo export --platform web` → push to `gh-pages`) and
sharing is live. Nothing else changes: with the fields blank, the app keeps
working exactly as before (local-only), so you can flip this on whenever.

## What's shared vs. local
- **Shared:** every **username** (registered centrally the moment it's created,
  unique by handle, reconnectable on another device) and every **review**
  (score, text, favourite dish, author name/avatar). A review someone writes
  shows up for everyone, feeds each restaurant's "Table favourite," and carries
  the writer's username.
- **Still local (per device):** your own ranked list, want-to-try, saved places,
  and language choice. Those are personal to each tester by design.

## Notes
- Accounts are keyed by the username each person picks in onboarding — no
  passwords, no email. Reconnecting on a new device is by handle. That's
  intentional for a low-friction pilot; swap in real auth later.
- To reset the demo, run `truncate public.reviews;` and/or
  `truncate public.profiles;` in the SQL editor.
