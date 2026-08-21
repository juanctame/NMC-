// CRTQ · sweep-places — server-side city sweep that fills the shared cache
// ────────────────────────────────────────────────────────────────────────
// Runs on a schedule (GitHub Action or pg_cron). Tiles a city into a grid of
// Nearby Search points, pages through each, dedupes by place_id, and UPSERTs the
// raw Google fields into `public.places` using the service-role key. Because the
// whole app then READS that one table, no visitor spends Google quota on load —
// the sweep pays it once per run for everyone.
//
// Deploy (JWT-verified; only callers with the secret may run it):
//   supabase functions deploy sweep-places
// Secrets required:
//   supabase secrets set GOOGLE_SERVER_KEY=<server key w/ Places API enabled>
//   supabase secrets set SWEEP_SECRET=<a long random string>
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Invoke:
//   curl -X POST "$SUPABASE_URL/functions/v1/sweep-places?city=cdmx" \
//        -H "x-sweep-secret: $SWEEP_SECRET"
// Optional query: ?grid=6 ?pages=3 ?radius=2400 (defaults mirror the live sweep).

const GOOGLE_KEY = Deno.env.get("GOOGLE_SERVER_KEY") ?? "";
const SWEEP_SECRET = Deno.env.get("SWEEP_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// City centers — mirrors src/data/cities.ts. Add a city here to sweep it.
const CITIES: Record<string, { lat: number; lon: number }> = {
  cdmx: { lat: 19.4194, lon: -99.1605 },
  mty: { lat: 25.6714, lon: -100.3094 },
  gdl: { lat: 20.6668, lon: -103.3556 },
  nyc: { lat: 40.7239, lon: -73.9945 },
  tyo: { lat: 35.68, lon: 139.715 },
};

const SPAN = 0.16; // ≈ 17 km across, centered on the city (matches the client)
const MAX_PHOTOS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const plainAttr = (html?: string) =>
  html ? html.replace(/<[^>]*>/g, "").trim() || null : null;

function gridPoints(c: { lat: number; lon: number }, grid: number) {
  const pts: { lat: number; lon: number }[] = [];
  const step = SPAN / (grid - 1);
  const start = -SPAN / 2;
  for (let i = 0; i < grid; i++)
    for (let j = 0; j < grid; j++)
      pts.push({ lat: c.lat + start + i * step, lon: c.lon + start + j * step });
  return pts;
}

// One point's restaurants, paged up to `pages`. Never throws — [] on error.
async function searchPoint(
  pt: { lat: number; lon: number },
  radius: number,
  pages: number,
): Promise<any[]> {
  const acc: any[] = [];
  let token: string | null = null;
  for (let page = 0; page < pages; page++) {
    let u =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${pt.lat},${pt.lon}&radius=${radius}&type=restaurant&key=${GOOGLE_KEY}`;
    if (token) u += `&pagetoken=${token}`;
    try {
      let res = await fetch(u);
      let data = await res.json();
      // A fresh next_page_token needs a moment to become valid — retry once.
      if (data.status === "INVALID_REQUEST" && token) {
        await sleep(2000);
        res = await fetch(u);
        data = await res.json();
      }
      if (Array.isArray(data.results)) acc.push(...data.results);
      token = data.next_page_token ?? null;
      if (!token) break;
      if (page < pages - 1) await sleep(2000); // token activation delay
    } catch {
      break;
    }
  }
  return acc;
}

function toRow(r: any, cityId: string) {
  const photos = Array.isArray(r.photos) ? r.photos.slice(0, MAX_PHOTOS) : [];
  const refs = photos.map((p: any) => p?.photo_reference).filter(Boolean);
  return {
    id: r.place_id,
    city_id: cityId,
    name: r.name,
    gtypes: Array.isArray(r.types) ? r.types : null,
    price_level: typeof r.price_level === "number" ? r.price_level : null,
    vicinity: r.vicinity ?? null,
    lat: r.geometry?.location?.lat ?? null,
    lon: r.geometry?.location?.lng ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    reviews: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
    photo_ref: refs[0] ?? null,
    photo_refs: refs.length ? refs : null,
    photo_attr: plainAttr(photos[0]?.html_attributions?.[0]),
    open_now: typeof r.opening_hours?.open_now === "boolean" ? r.opening_hours.open_now : null,
    updated_at: new Date().toISOString(),
  };
}

async function upsert(rows: any[]): Promise<number> {
  let done = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/places`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (res.ok) done += chunk.length;
  }
  return done;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const secret = req.headers.get("x-sweep-secret") ?? url.searchParams.get("secret") ?? "";
  if (!SWEEP_SECRET || secret !== SWEEP_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!GOOGLE_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    return new Response("server not configured", { status: 503 });
  }

  const cityId = (url.searchParams.get("city") ?? "cdmx").toLowerCase();
  const center = CITIES[cityId];
  if (!center) return new Response(`unknown city: ${cityId}`, { status: 400 });

  const grid = Math.max(2, Math.min(10, Number(url.searchParams.get("grid")) || 6));
  const pages = Math.max(1, Math.min(3, Number(url.searchParams.get("pages")) || 3));
  const radius = Math.max(500, Math.min(5000, Number(url.searchParams.get("radius")) || 2400));

  const pts = gridPoints(center, grid);
  const raw = (await Promise.all(pts.map((p) => searchPoint(p, radius, pages)))).flat();

  // Dedupe by place_id, keep operational venues with a location.
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const r of raw) {
    if (!r?.place_id || seen.has(r.place_id)) continue;
    if (!r.geometry?.location) continue;
    if (r.business_status && r.business_status !== "OPERATIONAL") continue;
    seen.add(r.place_id);
    rows.push(toRow(r, cityId));
  }

  const upserted = await upsert(rows);
  return new Response(
    JSON.stringify({ city: cityId, points: pts.length, found: rows.length, upserted }),
    { headers: { "Content-Type": "application/json" } },
  );
});
