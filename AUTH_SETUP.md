# Sign in with Google — setup

People can now **Continue with Google** on the welcome screen. That creates a
real user in **Supabase Auth** from their Google/Gmail identity, and the app
links it to a public profile (username, avatar, city). Sessions persist across
reloads and sign-out works.

The app code is done. Three things have to be configured once in the Supabase
and Google consoles (only you can do these — they need your accounts). ~10 min.

The button only appears when Supabase is configured (it already is, in
`src/config.ts`) and the app is running on the web build.

---

## 1. Create a Google OAuth client (Google Cloud console)

1. <https://console.cloud.google.com> → the **same project** as your Maps key.
2. *APIs & Services → OAuth consent screen*: set it up (External), add an app
   name + your email. Add your email as a **Test user** while it's unverified.
3. *APIs & Services → Credentials → Create credentials → OAuth client ID* →
   **Web application**.
4. Under **Authorized redirect URIs**, add exactly:
   ```
   https://psbxxcupbbgwcjzqkygb.supabase.co/auth/v1/callback
   ```
5. (Optional) Under **Authorized JavaScript origins**, add
   `https://juanctame.github.io`.
6. **Create** → copy the **Client ID** and **Client secret**.

## 2. Enable Google in Supabase

1. Supabase dashboard → your project → *Authentication → Providers → Google*.
2. Toggle **Enabled**, paste the **Client ID** and **Client secret** from step 1,
   **Save**.

## 3. Set the app URLs in Supabase

*Authentication → URL Configuration*:
- **Site URL:** `https://juanctame.github.io/NMC-/`
- **Redirect URLs → Add URL:** `https://juanctame.github.io/NMC-/`
  (and `http://localhost:8081/` if you test locally).

That's it — reload the deployed app and **Continue with Google** signs you in.

---

## 4. Add the account columns to the users table (SQL)

The `profiles` table (from `SHARED_DEMO.md`) gets three columns so a profile can
be tied to its Google user and found on return. Run in Supabase → **SQL Editor**:

```sql
alter table public.profiles
  add column if not exists user_id    uuid,
  add column if not exists email      text,
  add column if not exists avatar_url text;

-- Fast lookup when a returning Google user signs in.
create index if not exists profiles_email_idx on public.profiles (lower(email));
```

Nothing else changes — new usernames still register the same way; Google users
just additionally carry `user_id` + `email` + `avatar_url`.

> **Note on RLS:** the pilot keeps the permissive public read/insert/update
> policies from `SHARED_DEMO.md` so the anon key can register profiles. When you
> harden this, switch the profiles policies to key off `auth.uid()` (e.g.
> `using (auth.uid() = user_id)` for update) and gate inserts to the signed-in
> user — the `user_id` column added above is what that will hinge on.

---

## What each piece stores
- **Supabase `auth.users`** — the real user record created from Google (id,
  email, Google metadata). This is the "users database" of accounts.
- **`public.profiles`** — the app-facing profile (username, name, city, avatar),
  linked by `user_id`/`email`. Shown on the passport and across the app.

## If the button doesn't sign you in
- **"provider is not enabled"** → finish step 2.
- **redirect / "requested path is invalid"** → the app URL isn't in step 3's
  Redirect URLs, or the callback URI in step 1 doesn't match exactly.
- **Google "access blocked / app not verified"** → add your email as a Test user
  on the OAuth consent screen (step 1.2), or publish the consent screen.
- Nothing happens on native — Google sign-in here is web-only by design; the
  handle-based sign-in still works on native.

---

## Reminder: enable the YouTube in-app strip (separate, optional)
Unrelated to auth, but still pending on your side: to light up the in-app
hashtag-video strip, enable **YouTube Data API v3** on the same Google Cloud
project and add it to the Maps key's API restrictions — full steps in
`HASHTAG_VIDEOS.md`. The hashtag deep-links work without it.
