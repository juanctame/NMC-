# Food Passport — 3D renders

Brand renders of the You-tab passport, built as a real three.js scene so the
branding stays exact: the page artwork **is** the app (each page is captured
from the built web app), the colours are the CRTQ tokens (`src/theme/tokens.ts`,
no tone mapping), and the mascot / stickers use the brand assets and fonts.

Scenes (`scene.html?scene=…`):

- `hero` — the closed Food Passport and the press passport on vermillion, with
  the mascot, CDMX and EST. stickers.
- `spread` — the passport open on cream paper: data page + Visas, curved pages,
  page-block edges, the yellow cover rim and stitching in the gutter.
- `fan` — every page fanned like a hand of cards on sun-yellow, cover on top.

## Regenerate

1. Textures — build the web app (`npx expo export -p web`), open the You tab at
   390×844 with deviceScaleFactor 3, and save each passport page's frame
   (cover, data, visas, sellos, bio, notes, settings, press-cover) to `tex/*.png`.
   Copy `assets/brand/logo-sticker.png` → `tex/logo.png` and the Roquen /
   Megazoid fonts from `assets/fonts` into `tex/`.
2. three.js — `npm pack three@0.160.0` and extract into `lib/` (the scene imports
   `lib/package/build/three.module.js` and `RoomEnvironment.js`).
3. Render — `CHROME_PATH=… node render.js hero,spread,fan 2400 1800`
   (needs `playwright-core`; writes `out-<scene>.png`).
