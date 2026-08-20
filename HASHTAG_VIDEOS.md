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

## Trending now — "most mentioned this month"

The home Feed's **Trending now** strip ranks restaurants by how much they're
being talked about on social video **in the last 30 days**, and pairs each with
a real clip from a popular creator.

### The algorithm (`src/data/trendingLive.web.ts`)
For up to ten candidate places in the current city:

1. **Recent mentions.** One YouTube search per place, restricted to the last 30
   days (`publishedAfter`), embeddable videos only, ordered by view count.
2. **Popularity.** One batched `videos.list` call attaches each clip's view
   count.
3. **Buzz score.** Each place scores
   `Σ log10(views + 10) × (0.55 + 0.45 · recency)  +  0.4 × mentions`,
   where `recency = e^(−ageDays/21)` — so a place with many recent, high-view
   clips ranks above one with a single old video. Places are sorted by buzz;
   the **most-viewed** clip becomes the card's hero, and its creator is shown.
4. **Creator link.** If the hero clip's channel matches one of the app's
   tastemakers (`CREATOR_REVIEWS`), the card shows an **"On CRTQ"** chip that
   opens that creator in-app. Matching is by channel name/handle; for an exact
   tie, add the creator's YouTube `channelId` to `CREATOR_YT_CHANNELS` in
   `src/data/trending.ts`.

### Quota & caching
Each refresh costs ~10 search calls (100 units each) + 1 stats call, so the
result is **cached per city in the browser for 12 hours** (`nmc.trending.<city>`)
and only recomputed past that TTL. That keeps a client comfortably inside the
free **10,000 units/day**. For production, move this to a small daily server job
so every visitor shares one computed ranking instead of each spending quota.

### Platform scope
The live buzz signal is **YouTube** (the only social platform whose search +
embed work from a browser with just a key). TikTok/Instagram mention volume
needs a backend or OAuth — the ranking returns the same `BuzzResult[]` shape, so
an aggregator that adds those platforms drops straight in. Per-restaurant
TikTok/Instagram feeds are still one tap away via the hashtag deep-links on each
place page.

### If it's empty
When the YouTube key/API isn't enabled (or nothing recent matched), the strip
falls back to the **seeded** "Trending now" list — the app never shows an empty
section.

## What's real vs. seeded
- **Real & live:** the YouTube hashtag search results (titles, channels,
  thumbnails, playable video), the monthly buzz ranking, and every hashtag
  deep-link.
- **Seeded fallback:** the original "Trending now" list, shown only until the
  live ranking is available.
