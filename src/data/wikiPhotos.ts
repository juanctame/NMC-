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
const mem: Record<string, WikiImg> = loadCache();

function loadCache(): Record<string, WikiImg> {
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
async function wikiPage(title: string, lang: string): Promise<WikiPage | null> {
  // `extracts` (intro text) is enough for the keyword gate; we avoid `description`
  // because an unrecognised prop value errors the whole query on some wikis.
  const u =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1` +
    `&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=900&exintro=1&explaintext=1&exchars=500` +
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
  if (key in mem) return mem[key];
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

// ── Venues ───────────────────────────────────────────────────────────────────
const RE_VENUE = /restauran|taquer|caf[eé]|cantina|cocina|marisqu|fonda|panader|cafeter|bar\b|pizzer/i;

export async function resolveVenuePhoto(name: string): Promise<WikiImg> {
  const key = 'v:' + name.toLowerCase();
  if (key in mem) return mem[key];

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
  if (key in mem) return mem[key];
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
