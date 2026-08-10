# Shared demo (usernames + reviews across everyone)

By default the app is **local-only**: each tester's username and reviews live in
their own browser. Turning on a tiny Supabase backend makes **reviews shared** —
everyone who opens the link sees everyone else's reviews in real time. It's free
and takes about 5 minutes.

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
- **Shared:** every review (score, text, favourite dish, author name/avatar).
  A review someone writes shows up for everyone, feeds each restaurant's
  "Table favourite," and carries the writer's username.
- **Still local (per device):** your own ranked list, want-to-try, saved places,
  and the critic toggle. Those are personal to each tester by design.

## Notes
- Reviews are attributed by the username each person picks in onboarding — no
  passwords, no email. That's intentional for a low-friction pilot.
- To reset the demo, run `truncate public.reviews;` in the SQL editor.
