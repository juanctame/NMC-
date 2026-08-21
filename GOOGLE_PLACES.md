# Google Places — full-city coverage & real photos

The map/feed fill with **real, current Google Maps restaurants** for the selected
city, each showing its **actual Google Maps photo**. This is fetched live at
runtime — the app does not ship a stored list of restaurants or copies of their
photos.

## How coverage is maximized (`src/data/placesGoogle.web.ts`)
Google's Nearby Search returns at most ~60 places per query (3 pages of 20)
around a single point — one search only "sees" one neighborhood. To cover the
whole city we **tile it into a grid** of search points, page through each, and
**dedupe by `place_id`**:

- `GRID × GRID` search points spread across `SPAN` degrees, centered on the city
- each point searched at `RADIUS` metres, paged `MAX_PAGES` deep
- results merged and de-duplicated → **hundreds of live venues** instead of ~20

Defaults (central CDMX): `GRID=4` (16 points), `SPAN≈0.11°` (~12 km), `RADIUS=2400 m`,
`MAX_PAGES=2`. Turn `GRID`/`MAX_PAGES` up for more of the city (and more API calls),
down to spend less quota. The sweep runs **once per city per session** (the store
caches `nearby` until you change city), then everything is filtered/searched
locally.

## Photos
Each venue's photo comes from Google's own Places Photo endpoint via
`photo.getUrl({maxWidth,maxHeight})`, stored as `place.photoUrl` and rendered
live (`placePhoto()` in `src/assets.ts`) on the Feed cards, the place hero +
gallery, and the map card — with the required **attribution** shown over the
hero. Photos are never downloaded or re-hosted.

## What this is *not* (and why)
- **Not "every single restaurant" as a shipped dataset.** Google has no
  "list all" endpoint (Nearby Search caps at 60/query), and the Google Maps
  Platform Terms prohibit bulk-harvesting and permanently storing their places
  database. So there is no hardcoded file of all CDMX venues — the app pulls as
  many as Google will legitimately return, live, and dedupes them.
- **Not exported/re-hosted photos.** Maps photos are owned by their contributors
  and Google's Terms forbid downloading/redistributing them. We display them
  live from Google with attribution instead.

## Turning it on
Needs the **Places API** + **Maps JavaScript API** enabled on the browser key in
`src/config.ts` (referrer-restricted to the site). When the key/API is reachable
the city fills with live venues + real photos; when it isn't, the app falls back
to the offline CDMX sample so nothing breaks. Native builds use OpenStreetMap
(the Places JS library is web-only).

### Quota note
Each grid point/page is one Nearby Search request (~$32 / 1,000 on the Basic
tier). Defaults ≈ 16–32 requests per city load, once per session. Dial `GRID` /
`MAX_PAGES` to trade coverage for cost, or move the sweep to a cached backend job
for production.
