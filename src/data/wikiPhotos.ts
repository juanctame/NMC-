/**
 * Real, freely-licensed photos resolved live from Wikipedia + Wikimedia Commons.
 *
 * Keyless and CORS-friendly (the MediaWiki action API honours `origin=*`), so
 * these load straight in the visitor's browser — no Google key, nothing stored
 * server-side, nothing re-hosted (image URLs are Wikimedia's own, shown with
 * attribution). Coverage is partial by design: well-known venues, chefs with a
 * Wikipedia page, and recognisable dishes resolve to a real picture; everything
 * else returns null and the caller keeps its generated cover.
 *
 * Three lookups:
 *  - resolveVenuePhoto(name)  → a photo of the restaurant (famous ones)
 *  - resolveChefPhoto(name)   → the chef's portrait (chefs with a page)
 *  - resolveDishPhoto(dish)   → a reference plate for a recognised dish
 *
 * Results (including misses) are cached in-memory and in localStorage, so each
 * entity is fetched at most once per device.
 */

export type WikiImgResolved = { url: string; attr: string; pageUrl?: string };
export type WikiImg = WikiImgResolved | null;

const CACHE_KEY = 'nmc.wikiphotos.v1';
type Cached = WikiImg | WikiImgResolved[];
const mem: Record<string, Cached> = loadCache();

function loadCache(): Record<string, Cached> {
  try {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return {};
}

function saveCache() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify(mem));
  } catch {
    /* ignore */
  }
}

/** GET JSON with a hard timeout; null on any failure (offline, CORS, 4xx). */
async function jget(url: string): Promise<any | null> {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(to);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

type WikiPage = { thumb?: string; extract?: string; description?: string; title?: string };

function firstPage(data: any): WikiPage | null {
  const pages = data?.query?.pages;
  if (!pages) return null;
  const k = Object.keys(pages)[0];
  if (!k || k === '-1') return null;
  const p = pages[k];
  if (!p || p.missing !== undefined) return null;
  return { thumb: p.thumbnail?.source, extract: p.extract, description: p.description, title: p.title };
}

/** One Wikipedia article's lead image + intro text, by exact title (redirects followed). */
async function wikiPage(title: string, lang: string, chars = 500): Promise<WikiPage | null> {
  // `extracts` (intro text) is enough for the keyword gate; we avoid `description`
  // because an unrecognised prop value errors the whole query on some wikis.
  const u =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1` +
    `&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=900&exintro=1&explaintext=1&exchars=${chars}` +
    `&titles=${encodeURIComponent(title)}`;
  return firstPage(await jget(u));
}

/** The best-matching article title for a free-text query (or null). */
async function wikiSearchTitle(query: string, lang: string): Promise<string | null> {
  const u =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&list=search&srlimit=1&srsearch=${encodeURIComponent(query)}`;
  const d = await jget(u);
  return d?.query?.search?.[0]?.title || null;
}

function matches(re: RegExp, ...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && re.test(t));
}

function pageUrl(lang: string, title: string): string {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, '_'))}`;
}

const LANGS = ['es', 'en'];

// ── Chefs ────────────────────────────────────────────────────────────────────
const RE_CHEF = /\bchef|cociner|reposter|pastel|restauran|cocina|gastrón|gastron/i;

export async function resolveChefPhoto(name: string): Promise<WikiImg> {
  const key = 'c:' + name.toLowerCase();
  if (key in mem) return mem[key] as WikiImg;
  const clean = name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[«»"'·|].*$/g, '')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let res: WikiImg = null;
  for (const lang of LANGS) {
    const p = await wikiPage(clean, lang);
    if (p?.thumb && matches(RE_CHEF, p.extract, p.description)) {
      res = { url: p.thumb, attr: 'Wikipedia', pageUrl: pageUrl(lang, p.title || clean) };
      break;
    }
  }
  if (!res) {
    for (const lang of LANGS) {
      const t = await wikiSearchTitle(clean + ' chef', lang);
      if (!t) continue;
      const p = await wikiPage(t, lang);
      if (p?.thumb && matches(RE_CHEF, p.extract, p.description)) {
        res = { url: p.thumb, attr: 'Wikipedia', pageUrl: pageUrl(lang, p.title || t) };
        break;
      }
    }
  }
  mem[key] = res;
  saveCache();
  return res;
}

export type ChefBio = { extract: string; title: string; lang: string; pageUrl: string; thumb?: string };

const cleanChefName = (name: string) =>
  name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[«»"'·|].*$/g, '')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The chef's Wikipedia introduction (Spanish first, then English) — only when
 * the article is about a cook (same gate as the portrait), so a namesake never
 * lends their biography.
 */
export async function resolveChefBio(name: string): Promise<ChefBio | null> {
  const key = 'cb:' + name.toLowerCase();
  if (key in mem) return (mem[key] as unknown as ChefBio) || null;
  const clean = cleanChefName(name);
  let res: ChefBio | null = null;
  for (const lang of LANGS) {
    let p = await wikiPage(clean, lang, 1100);
    if (!(p?.extract && matches(RE_CHEF, p.extract))) {
      const t = await wikiSearchTitle(clean + ' chef', lang);
      p = t ? await wikiPage(t, lang, 1100) : null;
    }
    if (p?.extract && matches(RE_CHEF, p.extract) && fold(p.title || '').includes(fold(clean.split(' ').slice(-1)[0]))) {
      res = { extract: p.extract, title: p.title || clean, lang, pageUrl: pageUrl(lang, p.title || clean), thumb: p.thumb };
      break;
    }
  }
  mem[key] = res as unknown as Cached;
  saveCache();
  return res;
}

/** Photos of the chef on Wikimedia Commons (their full name in the file title). */
export async function resolveChefCommons(name: string): Promise<WikiImgResolved[]> {
  const clean = cleanChefName(name);
  const key = 'cc:' + fold(clean);
  if (key in mem) return (mem[key] as WikiImgResolved[]) || [];
  let out: WikiImgResolved[] = [];
  if (clean.split(' ').length >= 2) {
    const d = await jget(
      `${COMMONS}&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(`intitle:"${clean}" filetype:bitmap`)}` +
        `&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=900`,
    );
    const pages: CommonsPage[] = Object.values(d?.query?.pages || {});
    out = pages
      .filter((p) => fold(p.title).includes(fold(clean)) && !/logo|signature|firma/i.test(p.title))
      .map((p) => commonsImg(p, 'Wikimedia Commons'))
      .filter((x): x is WikiImgResolved => !!x && !!x.url)
      .slice(0, 6);
  }
  mem[key] = out;
  saveCache();
  return out;
}

// ── Venues ───────────────────────────────────────────────────────────────────
const RE_VENUE = /restauran|taquer|caf[eé]|cantina|cocina|marisqu|fonda|panader|cafeter|bar\b|pizzer/i;

export async function resolveVenuePhoto(name: string): Promise<WikiImg> {
  const key = 'v:' + name.toLowerCase();
  if (key in mem) return mem[key] as WikiImg;

  let res: WikiImg = null;
  for (const lang of LANGS) {
    const p = await wikiPage(name, lang);
    if (p?.thumb && matches(RE_VENUE, p.extract, p.description)) {
      res = { url: p.thumb, attr: 'Wikipedia', pageUrl: pageUrl(lang, p.title || name) };
      break;
    }
  }
  if (!res) {
    for (const lang of LANGS) {
      const q = lang === 'es' ? `${name} restaurante` : `${name} restaurant`;
      const t = await wikiSearchTitle(q, lang);
      if (!t) continue;
      const p = await wikiPage(t, lang);
      if (p?.thumb && matches(RE_VENUE, p.extract, p.description)) {
        res = { url: p.thumb, attr: 'Wikipedia', pageUrl: pageUrl(lang, p.title || t) };
        break;
      }
    }
  }
  mem[key] = res;
  saveCache();
  return res;
}

// ── Wikimedia Commons: files named after the venue, and photos taken nearby ──
const COMMONS = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*';
const NOT_SCENE = /\b(map|mapa|plano|locator|location|logo|flag|bandera|escudo|coat of arms|diagram|sign|señal|svg|icon)\b/i;

const plain = (html?: string) => (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type CommonsPage = { title: string; imageinfo?: { thumburl?: string; url?: string; mime?: string; extmetadata?: any }[]; coordinates?: { lat: number; lon: number }[] };

function commonsImg(p: CommonsPage, label: string): WikiImgResolved | null {
  const info = p.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || '')) return null;
  if (NOT_SCENE.test(p.title)) return null;
  const artist = plain(info.extmetadata?.Artist?.value);
  const license = plain(info.extmetadata?.LicenseShortName?.value);
  return {
    url: info.thumburl || info.url || '',
    attr: [label, artist && `${artist}`, license].filter(Boolean).join(' · ') || 'Wikimedia Commons',
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/\s/g, '_'))}`,
  };
}

/** Commons files whose title names the venue (e.g. "Contramar restaurant, Mexico City.jpg"). */
export async function resolveCommonsNamed(name: string): Promise<WikiImgResolved[]> {
  const key = 'cn:' + fold(name);
  if (key in mem) return (mem[key] as WikiImgResolved[]) || [];
  const n = fold(name);
  let out: WikiImgResolved[] = [];
  if (n.length >= 5) {
    const q = `intitle:"${name}" (Mexico OR México OR CDMX)`;
    const d = await jget(
      `${COMMONS}&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q)}` +
        `&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1000`,
    );
    const pages: CommonsPage[] = Object.values(d?.query?.pages || {});
    out = pages
      .filter((p) => fold(p.title).includes(n))
      .map((p) => commonsImg(p, 'Wikimedia Commons'))
      .filter((x): x is WikiImgResolved => !!x && !!x.url)
      .slice(0, 3);
  }
  mem[key] = out;
  saveCache();
  return out;
}

function meters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const x = r(bLon - aLon) * Math.cos(r((aLat + bLat) / 2));
  return Math.sqrt(x * x + r(bLat - aLat) ** 2) * 6371000;
}

/** Photos geotagged within a short walk of the venue — "around the corner". */
export async function resolveNearbyPhotos(lat: number, lon: number): Promise<WikiImgResolved[]> {
  const key = `nb:${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (key in mem) return (mem[key] as WikiImgResolved[]) || [];
  let out: WikiImgResolved[] = [];
  for (const radius of [200, 500]) {
    const d = await jget(
      `${COMMONS}&generator=geosearch&ggsnamespace=6&ggslimit=25&ggsradius=${radius}&ggscoord=${lat}|${lon}` +
        `&prop=imageinfo|coordinates&iiprop=url|mime|extmetadata&iiurlwidth=1000`,
    );
    const pages: CommonsPage[] = Object.values(d?.query?.pages || {});
    out = pages
      .map((p) => ({ p, dist: p.coordinates?.[0] ? meters(lat, lon, p.coordinates[0].lat, p.coordinates[0].lon) : radius }))
      .sort((a, b) => a.dist - b.dist)
      .map(({ p, dist }) => commonsImg(p, `${Math.max(10, Math.round(dist / 10) * 10)} m away · Wikimedia Commons`))
      .filter((x): x is WikiImgResolved => !!x && !!x.url)
      .slice(0, 4);
    if (out.length) break;
  }
  mem[key] = out;
  saveCache();
  return out;
}

// ── Neighbourhoods ───────────────────────────────────────────────────────────
const RE_HOOD = /ciudad de m[eé]xico|cdmx|alcald[ií]a|delegaci[oó]n|colonia|barrio|mexico city|neighbou?rhood/i;
const MAPPY = /map|mapa|locator|location|plano|\.svg/i;

/** The lead photo of the venue's neighbourhood (colonia) article. */
export async function resolveHoodPhoto(hood: string, borough?: string): Promise<WikiImg> {
  const key = 'h:' + fold(hood);
  if (key in mem) return mem[key] as WikiImg;
  const tries: [string, string, boolean][] = [
    [`Colonia ${hood}`, 'es', false],
    [hood, 'es', false],
    [`${hood} colonia Ciudad de México`, 'es', true],
    [`${hood}, Mexico City`, 'en', true],
    ...(borough ? ([[`${borough} Ciudad de México alcaldía`, 'es', true]] as [string, string, boolean][]) : []),
  ];
  let res: WikiImg = null;
  for (const [q, lang, search] of tries) {
    const title = search ? await wikiSearchTitle(q, lang) : q;
    if (!title) continue;
    const p = await wikiPage(title, lang);
    if (p?.thumb && !MAPPY.test(p.thumb) && matches(RE_HOOD, p.extract)) {
      res = { url: p.thumb, attr: `${p.title || title} · Wikipedia`, pageUrl: pageUrl(lang, p.title || title) };
      break;
    }
  }
  mem[key] = res;
  saveCache();
  return res;
}

// ── Dishes (reference plates) ─────────────────────────────────────────────────
// Map a free-text "what to order" line to a recognised dish, then fetch that
// dish's article image — a *reference* photo of the plate, not the exact serving.
const DISH_MAP: [RegExp, string][] = [
  [/al pastor|trompo/, 'Tacos al pastor'],
  [/cochinita/, 'Cochinita pibil'],
  [/\bmole/, 'Mole'],
  [/aguachile/, 'Aguachile'],
  [/tlacoyo/, 'Tlacoyo'],
  [/chilaquil/, 'Chilaquiles'],
  [/esquite|elote/, 'Esquites'],
  [/pozole/, 'Pozole'],
  [/\btetela/, 'Tetela'],
  [/memela/, 'Memela'],
  [/\bsopes?\b/, 'Sope'],
  [/quesadilla/, 'Quesadilla'],
  [/enchilada/, 'Enchiladas'],
  [/\btamal/, 'Tamal'],
  [/barbacoa/, 'Barbacoa'],
  [/suadero/, 'Suadero'],
  [/cecina/, 'Cecina'],
  [/tostada/, 'Tostada'],
  [/ceviche/, 'Ceviche'],
  [/aguacate|guacamole/, 'Guacamole'],
  [/\bpulpo/, 'Pulpo a la gallega'],
  [/chile en nogada/, 'Chiles en nogada'],
  [/pan de muerto/, 'Pan de muerto'],
  [/\bconcha/, 'Concha (pan)'],
  [/croissant|cruas/, 'Cruasán'],
  [/churro/, 'Churro'],
  [/\bpizza/, 'Pizza'],
  [/\bpasta|espagueti|rigaton|tagliat/, 'Pasta'],
  [/\bramen/, 'Ramen'],
  [/\bsushi|nigiri|omakase/, 'Sushi'],
  [/\btaco/, 'Taco'],
  [/mezcal/, 'Mezcal'],
  [/\bmaíz|maiz/, 'Maíz'],
];

/** The canonical dish a "what to order" line refers to, if recognised. */
export function dishTerm(dish: string): string | null {
  const d = dish
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  const hit = DISH_MAP.find(([re]) => re.test(d));
  return hit ? hit[1] : null;
}

export async function resolveDishPhoto(term: string): Promise<WikiImg> {
  const key = 'd:' + term;
  if (key in mem) return mem[key] as WikiImg;
  let res: WikiImg = null;
  for (const lang of LANGS) {
    const p = await wikiPage(term, lang);
    if (p?.thumb) {
      res = { url: p.thumb, attr: 'Wikimedia', pageUrl: pageUrl(lang, p.title || term) };
      break;
    }
  }
  mem[key] = res;
  saveCache();
  return res;
}
