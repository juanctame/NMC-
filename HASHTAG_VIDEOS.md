# Hashtag videos — real clips per restaurant

Every restaurant now has a **hashtag** (e.g. El Vilsito → `#ElVilsito`), and the
place page has an **On the reel** section that connects that hashtag to real,
current short-form videos:

- **In-app strip (YouTube):** live clips found by the restaurant's hashtag +
  name, played inside the app in an embedded player. YouTube is the one platform
  whose hashtag/keyword search *and* embed both work from a browser with just an
  API key (no OAuth), so it's what loads clips in-app.
- **Live hashtag feeds (all platforms):** `TikTok · Instagram · YouTube` chips
  open each platform's hashtag page — the real, always-current feed for that
  venue. These need no key and work everywhere, including the native app.

The hashtag is derived from the name automatically (accents stripped, words
joined): "Panadería Rosetta" → `#PanaderiaRosetta`, "Taquería Orinoco" →
`#TaqueriaOrinoco`.

## Turning on the in-app YouTube strip

The strip uses the **YouTube Data API v3**, billed on the same Google Cloud
project as the Maps key. It reuses the Maps browser key by default
(`YOUTUBE_API_KEY` in `src/config.ts`). To switch it on:

1. **Enable the API.** Google Cloud console → *APIs & Services → Library* →
   search **"YouTube Data API v3"** → **Enable**, on the same project as your
   Maps key.
2. **Allow it on the key.** *APIs & Services → Credentials* → your browser key →
   *API restrictions* → add **YouTube Data API v3** to the allowed list (keep
   the existing *Maps JavaScript API*). Leave the *Websites* referrer
   restriction as-is (`https://juanctame.github.io/*`, `http://localhost:*`).
3. That's it — rebuild + redeploy. The in-app strip fills with real clips.

Prefer a separate key? Create another browser key (referrer-restricted the same
way, restricted to YouTube Data API v3) and paste it as `YOUTUBE_API_KEY` in
`src/config.ts`.

### Quota note
The free YouTube Data API tier is **10,000 units/day**; each hashtag search
costs **100 units** (~100 place-opens/day). The app fetches once per place per
session and caches the result, so normal browsing stays well under the cap. If
you outgrow it, request more quota in the console or add a small backend cache.

### If the strip is empty
That's the safe default — the app shows *"No in-app clips yet"* and the hashtag
deep-links still work. Causes: the API isn't enabled yet, the key doesn't allow
it, the referrer isn't whitelisted, or no embeddable videos matched the tag.
Leaving `YOUTUBE_API_KEY` blank turns the in-app strip off entirely while
keeping the TikTok/Instagram/YouTube hashtag links.

## What's real vs. seeded
- **Real & live:** the YouTube search results (titles, channels, thumbnails,
  playable video) and every hashtag deep-link.
- **Still seeded:** the "Trending now" strip on the home Feed (a curated pilot
  list). It plugs into the same `TrendingVideo` shape when you wire a gather
  pipeline later.
