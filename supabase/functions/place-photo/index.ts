// CRTQ · place-photo — live Google photo proxy
// ────────────────────────────────────────────
// Turns a Google `photo_reference` (stored in the places cache) into the actual
// Google Maps photo, WITHOUT ever shipping the server key to the browser and
// WITHOUT re-hosting the image. Google's Place Photo endpoint answers a valid
// request with a 302 redirect to a keyless googleusercontent URL; we make that
// request server-side with the private key, read the redirect target, and hand
// the browser its own 302 to that keyless URL. The photo bytes come straight
// from Google (attribution is preserved on the cached row), and the key stays
// on the server.
//
// Deploy PUBLIC (an <img> tag can't send an Authorization header):
//   supabase functions deploy place-photo --no-verify-jwt
// Secret required:
//   supabase secrets set GOOGLE_SERVER_KEY=<a server key with Places API enabled>
//
// The server key must be a SEPARATE, unrestricted-referrer key from the browser
// key in src/config.ts — it lives only in Supabase secrets, never in the app.

const GOOGLE_KEY = Deno.env.get("GOOGLE_SERVER_KEY") ?? "";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  const w = Math.max(80, Math.min(1600, Number(url.searchParams.get("w")) || 800));

  if (!ref) return new Response("missing ref", { status: 400, headers: CORS });
  if (!GOOGLE_KEY) return new Response("server key not configured", { status: 503, headers: CORS });

  const g =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${w}&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_KEY}`;

  try {
    // redirect: manual → we read Google's 302 target (a keyless lh3 URL).
    const res = await fetch(g, { redirect: "manual" });
    const loc = res.headers.get("location");
    if (loc) {
      return new Response(null, {
        status: 302,
        headers: {
          ...CORS,
          Location: loc,
          // Photos are immutable per reference — let the browser/CDN cache hard.
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        },
      });
    }
    // Some responses stream the image directly instead of redirecting: pass through.
    if (res.ok && res.body) {
      return new Response(res.body, {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        },
      });
    }
    return new Response("photo unavailable", { status: 502, headers: CORS });
  } catch {
    return new Response("photo fetch failed", { status: 502, headers: CORS });
  }
});
