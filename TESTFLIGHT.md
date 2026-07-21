# Shipping NO MAD CORNER to TestFlight

A step-by-step for a first TestFlight run using **EAS Build** (cloud — **no Mac
required**). Bundle identifier: `com.nomadcorner.app`.

> Do the **Phase 0** accounts first — Apple approval is the only slow step.

---

## Phase 0 — Accounts (start now)

- [ ] **Apple Developer Program** — enroll at
  <https://developer.apple.com/programs/> ($99/yr). Approval can take **24–48h**.
  This gates TestFlight; nothing else can proceed until it's active.
- [ ] **Expo account** — free at <https://expo.dev/signup> (or let `eas login`
  create one). The free tier can build for TestFlight (builds may queue).

## Phase 1 — One-time local setup

Prereqs: Node 18+, this repo cloned.

```bash
npm install
npm i -g eas-cli
eas login                 # sign in (or create) your Expo account
eas init                  # creates the EAS project, writes extra.eas.projectId into app.json
```

- [ ] Commit the `app.json` change that `eas init` makes (the `projectId`).

## Phase 2 — Build the iOS app (on EAS servers)

```bash
eas build --profile production --platform ios
```

- [ ] When asked **"Generate a new Apple Distribution Certificate?"** → **Yes**.
      Let EAS manage credentials — it logs into your Apple account and creates the
      App ID (`com.nomadcorner.app`), distribution certificate, and provisioning
      profile automatically.
- [ ] Wait for the build (~10–20 min; may queue on the free tier). You'll get a
      build URL and a downloadable `.ipa`.

Build numbers auto-increment on EAS (`appVersionSource: remote` + `autoIncrement`
in `eas.json`), so you don't bump them by hand.

## Phase 3 — Submit to TestFlight

```bash
eas submit --profile production --platform ios --latest
```

- [ ] Authenticate with your Apple ID (or an App Store Connect API key — see
      below, recommended).
- [ ] If the app record doesn't exist yet, let `eas submit` **create it**
      (name: **NO MAD CORNER**).
- [ ] EAS uploads the build to App Store Connect.

## Phase 4 — TestFlight in App Store Connect

Go to <https://appstoreconnect.apple.com> → **Apps → NO MAD CORNER → TestFlight**.

- [ ] The build shows **Processing** (~10–30 min), then **Ready to Test**.
      Export compliance won't prompt — the app declares no non-exempt encryption
      (`ITSAppUsesNonExemptEncryption: false` in `app.json`).
- [ ] **Internal testing:** add testers (App Store Connect team members, up to
      100). Available immediately — **no review**.
- [ ] **External testing (optional):** create a group, invite up to 10,000
      testers by email or public link. Requires a short **Beta App Review**
      (usually < 24h) and Test Information (feedback email + what to test).

---

## Recommended: App Store Connect API key (smoother, non-interactive submits)

1. App Store Connect → **Users and Access → Integrations → App Store Connect API**
   → generate a key with the **App Manager** role.
2. Download the **`.p8`** (only offered once) and note the **Key ID** and
   **Issuer ID**.
3. Reference them in `eas.json` under `submit.production.ios` (or pass by env).
   **Never commit the `.p8`.** Example:

   ```json
   "submit": {
     "production": {
       "ios": {
         "ascApiKeyPath": "./AuthKey_XXXXXXX.p8",
         "ascApiKeyId": "XXXXXXX",
         "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
       }
     }
   }
   ```
   (Add `AuthKey_*.p8` to `.gitignore` — it already ignores `*.p8`.)

## Test notes to hand your testers

- **What to try:** rank a place with the center **⊕** button (gut-check → a couple
  of comparisons → a stamped score); browse Feed / Log / Passport; open a Table
  event and **Save my seat**; unlock the hidden **Dine Club** by tapping the
  corner logo **5× quickly** on the Feed.
- **Known limitations (pilot):** sample data is hardcoded; food photos are
  design-system stand-ins; "Add yours" appends from a local pool (not the real
  camera yet). See the README for the full production checklist.

## Later builds

Edit code → `eas build --profile production --platform ios` → `eas submit … --latest`.
Version bumps are automatic. Raise `version` in `app.json` (e.g. `1.0.1`) for a
user-facing version change.
