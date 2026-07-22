# Web preview (showcase without installing)

For quick demos, NO MAD CORNER is also exported as a **static web build** you can
open on any phone via a URL — no computer, no Expo Go, no accounts. It's the same
React Native app rendered with `react-native-web`.

## Live URL

**https://juanctame.github.io/NMC-/**

(Live once GitHub Pages is enabled: repo **Settings → Pages → Deploy from a
branch → `gh-pages` / root**. The repo must be public for free Pages.)

Tip: on iPhone Safari, **Share → Add to Home Screen** launches it full-screen
like the real app.

## How it's hosted

- The built site lives on the **`gh-pages`** branch (served at the `/NMC-/`
  subpath — hence `experiments.baseUrl: "/NMC-"` and `web.output: "single"` in
  `app.json`).
- `.nojekyll` is included so GitHub Pages serves the `_expo/` folder.

## Rebuild & redeploy after code changes

```bash
# 1) build the static web bundle
npx expo export --platform web --output-dir dist

# 2) publish dist/ to the gh-pages branch (from a clean copy)
cp -r dist /tmp/nmc-web && cd /tmp/nmc-web && touch .nojekyll
git init && git add -A && git commit -m "Deploy web build"
git branch -M gh-pages
git push -f https://github.com/juanctame/NMC-.git gh-pages
```

Or ask and a GitHub Action can be added to auto-deploy this on every push to
`main`.

## Notes

- Web is for **showcasing**. The real targets are Expo Go (dev) and a native
  **TestFlight / App Store** build (see `TESTFLIGHT.md`).
- On web, `Animated` with `useNativeDriver` falls back to JS-based animation
  (one console warning, no functional impact). Everything else — fonts, the
  printed map, sticker shadows, roundels — renders as designed.
