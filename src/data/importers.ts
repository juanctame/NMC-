/**
 * Bring your places — read the lists people already keep elsewhere and turn
 * them into import entries (name, their score, been / want-to-try, colonia,
 * note, coordinates). Pure functions, no network: everything is read on the
 * device. Matching entries to real places is placeMatch.ts.
 *
 *  - Beli: screenshots of your lists (read with OCR, ocr.web.ts) or a copied /
 *    shared list. Rows look like "Contramar / Roma Nte., Mexico City / 9.4".
 *  - Google Maps: a Google Takeout export — saved lists (CSV), starred places
 *    ("Saved Places.json"), your reviews ("Reviews.json"), older Timeline
 *    history — or pasted Maps links.
 *  - Notes / any list: pasted text — bullets, numbers, checklists, "9/10",
 *    "4.5/5", ★★★★, "Want to try:" sections.
 *  - Any file: CSV with a name column, JSON, KML (Google My Maps).
 */

export type ImportSource = 'beli' | 'google' | 'notes' | 'photos' | 'file';
export type ImportList = 'been' | 'want';

export type ImportEntry = {
  name: string;
  score?: number; // their score, normalised to 0–10
  list?: ImportList; // where it came from, when the source says
  hood?: string;
  note?: string;
  address?: string;
  lat?: number;
  lon?: number;
  url?: string;
  onlyIfMatched?: boolean; // e.g. Timeline visits: import only when it's a known place
  visits?: number;
};

const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Any score → 0–10 (one decimal). */
export function normScore(v: number, scale?: number): number | undefined {
  if (!Number.isFinite(v) || v < 0) return undefined;
  let s = v;
  if (scale === 5) s = v * 2;
  else if (scale === 100) s = v / 10;
  else if (!scale && v > 10 && v <= 100) s = v / 10; // OCR dropped the dot ("94" → 9.4)
  if (s > 10) return undefined;
  return round1(s);
}

// ── text lists (Notes, Beli copy / OCR, anything pasted) ────────────────────

const BEEN_HDR = /^(?:#+\s*)?(been|visited|tried|eaten|fui|ya fui|probad[oa]s|visitad[oa]s|favorit[oe]s|favs|my top|top \d+|ranking|mis favoritos)\b[^a-z]*$/i;
const WANT_HDR = /^(?:#+\s*)?(want to (?:try|go)|to try|wishlist|bucket ?list|por (?:probar|ir|visitar)|pendientes|quiero (?:ir|probar)|saved|guardad[oa]s|next)\b[^a-z]*$/i;
const NAV = new Set(['wantto', 'wanttotry', 'feed', 'lists', 'list', 'search', 'leaderboard', 'profile', 'recs', 'been', 'want', 'to', 'try', 'trending', 'home', 'explore', 'map', 'share', 'edit', 'sort', 'filter', 'my', 'more', 'activity', 'inbox']);
const CITY_TAIL = /,\s*(mexico city|ciudad de m[eé]xico|cdmx|m[eé]xico|df|mx)\.?\s*$/i;
const CATEGORY = /([|·•]\s*\${1,4}(?=\s|$)|^\${1,4}$|^\s*\${1,4}\s*[·|•])/;
const ADDRESS = /\b(c\.?\s?p\.?\s?\d{5}|\d{5}\b|col\.|colonia|calle|av\.|avenida|blvd|#\s?\d+|\d+\s+(?:[A-ZÁÉÍÓÚ][a-z]+\s){0,2}(?:st|ave|street))/i;

function stripLead(line: string): { text: string; checked?: boolean } {
  let t = line.trim();
  let checked: boolean | undefined;
  const box = t.match(/^(?:[-*•◦▪]\s*)?\[( |x|X|✓)\]\s*/);
  if (box) {
    checked = box[1] !== ' ';
    t = t.slice(box[0].length);
  } else if (/^[☑✅✔✓]/.test(t)) {
    checked = true;
    t = t.replace(/^[☑✅✔✓]\uFE0F?\s*/, '');
  } else if (/^[☐⬜□]/.test(t)) {
    checked = false;
    t = t.replace(/^[☐⬜□]\uFE0F?\s*/, '');
  }
  t = t.replace(/^(?:[-*•◦▪–—>]+|\d{1,3}\s*[.)\]:]|#\d{1,3})\s+/, '');
  return { text: t.trim(), checked };
}

/** Pull a score out of a line: "9/10", "4.5/5", "★★★★☆", "(8.7)", a trailing "9.2". */
export function takeScore(line: string): { rest: string; score?: number } {
  let m = line.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*\/\s*(10|5|100)\b/);
  if (m) return { rest: (line.slice(0, m.index) + line.slice(m.index! + m[0].length)).trim(), score: normScore(parseFloat(m[1].replace(',', '.')), Number(m[2])) };
  m = line.match(/(?:[★⭐]\uFE0F?){1,5}[☆✩]{0,4}/u);
  if (m) {
    const stars = (m[0].match(/[★⭐]/gu) || []).length;
    return { rest: line.replace(m[0], '').replace(/\uFE0F/g, '').trim(), score: normScore(stars, 5) };
  }
  m = line.match(/\(\s*(10(?:[.,]0)?|\d[.,]\d{1,2})\s*\)/);
  if (m) return { rest: line.replace(m[0], '').trim(), score: normScore(parseFloat(m[1].replace(',', '.')), 10) };
  m = line.match(/(?:^|\s)(10(?:[.,]0)?|\d[.,]\d|\d{2})\s*$/);
  if (m) {
    const v = parseFloat(m[1].replace(',', '.'));
    const sc = normScore(v, m[1].includes('.') || m[1].includes(',') || v === 10 ? 10 : undefined);
    if (sc != null) return { rest: line.slice(0, m.index).trim(), score: sc };
  }
  return { rest: line };
}

/** A Google Maps place link → name + coordinates (short links can't be read offline). */
export function parseMapsUrl(url: string): { name?: string; lat?: number; lon?: number } | null {
  if (!/google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url)) return null;
  const out: { name?: string; lat?: number; lon?: number } = {};
  const place = url.match(/\/maps\/place\/([^/@?]+)/);
  if (place) out.name = decodeURIComponent(place[1].replace(/\+/g, ' ')).trim();
  const q = url.match(/[?&](?:q|query)=([^&]+)/);
  if (!out.name && q) {
    const v = decodeURIComponent(q[1].replace(/\+/g, ' '));
    const ll = v.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (ll) {
      out.lat = +ll[1];
      out.lon = +ll[2];
    } else out.name = v.split(',')[0].trim();
  }
  const at = url.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) || url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/);
  if (at && out.lat == null) {
    out.lat = +at[1];
    out.lon = +at[2];
  }
  return out;
}

/** OCR noise ("Tv", "=X", "e)") vs a name: enough letters, mostly letters. */
const ocrClean = (t: string) => {
  const letters = (t.match(/\p{L}/gu) || []).length;
  const chars = t.replace(/\s/g, '').length;
  return letters >= 3 && letters / Math.max(1, chars) >= 0.6;
};

const looksLikeName = (t: string) => {
  const w = t.split(/\s+/).length;
  return t.length >= 2 && t.length <= 70 && w <= 9 && /\p{L}/u.test(t) && !/^(https?:|www\.)/i.test(t);
};

/**
 * Any pasted / OCR'd list → entries. Handles bullets, numbering, checklists,
 * section headers ("Want to try:"), scores in any common form, "Name — note",
 * "Name, Colonia", Maps links, and Beli rows (name, then "Colonia, Mexico City",
 * category "Tacos | $", score — in any order).
 */
export function parseListText(text: string, opts: { list?: ImportList; strict?: boolean } = {}): ImportEntry[] {
  const out: ImportEntry[] = [];
  let mode: ImportList | undefined = opts.list;
  let cur: ImportEntry | null = null;
  const lines = String(text || '').split(/\r?\n/);
  const attachScore = (sc?: number) => {
    if (sc == null) return;
    const target = cur && cur.score == null ? cur : [...out].reverse().find((e) => e.score == null);
    if (target) target.score = sc;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    // section headers
    const been = BEEN_HDR.test(line);
    const want = WANT_HDR.test(line);
    if (been !== want && line.length <= 32) {
      mode = been ? 'been' : 'want';
      cur = null;
      continue;
    }
    // app chrome: clock, battery, tab bars
    if (/^\d{1,2}:\d{2}\b/.test(line) || /\d{1,3}\s?%$/.test(line)) continue;
    const toks = fold(line).split(/[^a-z]+/).filter(Boolean);
    if (toks.length && toks.filter((t) => NAV.has(t)).length >= Math.max(1, toks.length * 0.75)) continue;
    // a Maps link
    const url = line.match(/https?:\/\/\S+/)?.[0];
    if (url) {
      const m = parseMapsUrl(url);
      const before = line.replace(url, '').trim();
      if (m?.name || (before && looksLikeName(stripLead(before).text))) {
        const nm = m?.name || stripLead(before).text;
        cur = { name: nm, ...(m?.lat != null ? { lat: m.lat, lon: m.lon } : {}), url, ...(mode ? { list: mode } : {}) };
        out.push(cur);
      } else if (cur) {
        cur.url = url;
        if (m?.lat != null && cur.lat == null) {
          cur.lat = m.lat;
          cur.lon = m.lon;
        }
      }
      continue;
    }
    // "Colonia, Mexico City" (Beli) — maybe with a leading rank and a trailing score
    const { rest: noScore, score } = takeScore(line);
    const loc = noScore.replace(/^\d{1,3}[A-Z]?\s+/, '').trim();
    if (CITY_TAIL.test(loc)) {
      if (cur && !cur.hood) cur.hood = loc.replace(CITY_TAIL, '').trim();
      attachScore(score);
      continue;
    }
    // "Seafood | $$$" category lines
    if (CATEGORY.test(noScore)) {
      if (cur && !cur.note) cur.note = noScore.replace(/\s*[|·]\s*\${1,4}.*$/, '').trim() || undefined;
      attachScore(score);
      continue;
    }
    // a score on its own line
    if (!noScore.replace(/[^\p{L}]/gu, '')) {
      attachScore(score);
      continue;
    }
    // an address under the name
    if (cur && ADDRESS.test(noScore) && /\d/.test(noScore) && !cur.address) {
      cur.address = noScore;
      continue;
    }
    // an entry
    const { text, checked } = stripLead(noScore);
    let name = text;
    let note: string | undefined;
    const sep = name.match(/\s+[-–—]\s+|:\s+|\s+\|\s+|\s+·\s+/);
    if (sep && sep.index! > 1) {
      note = name.slice(sep.index! + sep[0].length).trim() || undefined;
      name = name.slice(0, sep.index).trim();
    }
    const paren = name.match(/\s*\(([^)]*)\)\s*$/);
    if (paren) {
      note = [paren[1], note].filter(Boolean).join(' · ') || undefined;
      name = name.slice(0, paren.index).trim();
    }
    let hood: string | undefined;
    const comma = name.match(/^([^,]{2,60}),\s*([^,]{2,40})$/);
    if (comma && comma[2].split(/\s+/).length <= 3) {
      name = comma[1].trim();
      hood = comma[2].replace(CITY_TAIL, '').trim();
    }
    name = name.replace(/[.,;]+$/, '').trim();
    if (!looksLikeName(name) || (opts.strict && !ocrClean(name))) {
      if (cur && !cur.note && noScore.length <= 200) cur.note = noScore; // a sentence about the last place
      continue;
    }
    const list: ImportList | undefined = checked === true ? 'been' : checked === false ? 'want' : mode;
    cur = { name, ...(score != null ? { score } : {}), ...(list ? { list } : {}), ...(hood ? { hood } : {}), ...(note ? { note } : {}) };
    out.push(cur);
  }
  return dedupe(out);
}

function dedupe(list: ImportEntry[]): ImportEntry[] {
  const seen = new Map<string, ImportEntry>();
  for (const e of list) {
    const k = fold(e.name).replace(/[^a-z0-9]+/g, ' ').trim();
    const prev = seen.get(k);
    if (!prev) seen.set(k, e);
    else {
      // keep the richer record; a visit count adds up
      prev.score ??= e.score;
      prev.hood ??= e.hood;
      prev.note ??= e.note;
      prev.lat ??= e.lat;
      prev.lon ??= e.lon;
      prev.list ??= e.list;
      if (e.visits) prev.visits = (prev.visits || 1) + e.visits;
    }
  }
  return [...seen.values()];
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function parseCsv(text: string): string[][] {
  const s = String(text || '').replace(/^\uFEFF/, '');
  // the separator the header uses most: comma, semicolon (Spanish Excel) or tab
  const head = s.slice(0, s.search(/\r?\n/) >>> 0 || s.length);
  const delim = [',', ';', '\t'].map((d) => [d, head.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        f += '"';
        i++;
      } else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else f += c;
  }
  if (f || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const col = (hdr: string[], re: RegExp) => hdr.findIndex((h) => re.test(fold(h).trim()));

/** Rows with a header → entries (Google saved lists, Beli/Letterboxd-style exports, any sheet). */
export function entriesFromTable(rows: string[][], opts: { list?: ImportList } = {}): ImportEntry[] {
  if (rows.length < 2) return [];
  const hdr = rows[0];
  const iName = col(hdr, /^(name|title|restaurant|restaurante|place|lugar|nombre|venue|business name|titulo)$/);
  if (iName < 0) return [];
  const iScore = col(hdr, /(score|rating|calificacion|puntuacion|stars|estrellas|grade|nota$)/);
  const iNote = col(hdr, /^(note|notes|comment|comments|review|resena|notas|comentario|description)$/);
  const iUrl = col(hdr, /^(url|link|google maps url|maps url)$/);
  const iLat = col(hdr, /^(lat|latitude|latitud)$/);
  const iLon = col(hdr, /^(lon|lng|long|longitude|longitud)$/);
  const iHood = col(hdr, /^(neighborhood|neighbourhood|colonia|hood|area|city|ciudad)$/);
  const iList = col(hdr, /^(list|status|estado|been|lista)$/);
  const iAddr = col(hdr, /^(address|direccion)$/);
  const out: ImportEntry[] = [];
  for (const r of rows.slice(1)) {
    const name = (r[iName] || '').trim();
    if (!looksLikeName(name)) continue;
    const e: ImportEntry = { name };
    if (iScore >= 0 && r[iScore]) {
      const raw = r[iScore].trim();
      const t = takeScore(raw);
      const sc = t.score ?? (/^\d+(?:[.,]\d+)?$/.test(raw) ? normScore(parseFloat(raw.replace(',', '.')), parseFloat(raw) <= 5 && !raw.includes('.') ? 5 : undefined) : undefined);
      if (sc != null) e.score = sc;
    }
    if (iNote >= 0 && r[iNote]?.trim()) e.note = r[iNote].trim().slice(0, 300);
    if (iUrl >= 0 && r[iUrl]) {
      e.url = r[iUrl].trim();
      const m = parseMapsUrl(e.url);
      if (m?.lat != null) {
        e.lat = m.lat;
        e.lon = m.lon;
      }
    }
    if (iLat >= 0 && iLon >= 0 && r[iLat] && r[iLon]) {
      const la = parseFloat(r[iLat]);
      const lo = parseFloat(r[iLon]);
      if (Number.isFinite(la) && Number.isFinite(lo) && (la || lo)) {
        e.lat = la;
        e.lon = lo;
      }
    }
    if (iHood >= 0 && r[iHood]?.trim()) e.hood = r[iHood].trim().replace(CITY_TAIL, '');
    if (iAddr >= 0 && r[iAddr]?.trim()) e.address = r[iAddr].trim();
    const l = iList >= 0 ? fold(r[iList] || '') : '';
    e.list = /want|try|saved|pendiente|quiero/.test(l) ? 'want' : /been|visited|fui|probad|yes|true|1/.test(l) ? 'been' : opts.list;
    if (!e.list) delete e.list;
    out.push(e);
  }
  return dedupe(out);
}

// ── Google Takeout ──────────────────────────────────────────────────────────

/** What a saved-list file's name says about it ("Want to go.csv", "Favorites.csv"). */
export function listFromFileName(name: string): ImportList | undefined {
  const n = fold(name);
  if (/want|quiero|por ir|to go|to try|wishlist|guardad|saved|starred|destacad/.test(n)) return 'want';
  if (/favorit|been|visited|fui|reviews|resenas|timeline|historial/.test(n)) return 'been';
  return undefined;
}

/** Google Takeout JSON: Saved Places (GeoJSON), Reviews, older Timeline; or any JSON list. */
export function entriesFromJson(data: unknown, fileName = ''): ImportEntry[] {
  const d = data as any;
  const list = listFromFileName(fileName);
  const out: ImportEntry[] = [];
  if (d && Array.isArray(d.features)) {
    for (const f of d.features) {
      const p = f.properties || {};
      const loc = p.location || p.Location || {};
      const name = loc.name || loc['Business Name'] || p.Title || p.name || p.title;
      if (!name || !looksLikeName(String(name).trim())) continue;
      const e: ImportEntry = { name: String(name).trim() };
      const g = f.geometry?.coordinates;
      if (Array.isArray(g) && (g[0] || g[1])) {
        e.lon = +g[0];
        e.lat = +g[1];
      } else if (loc['Geo Coordinates']) {
        e.lat = +loc['Geo Coordinates'].Latitude;
        e.lon = +loc['Geo Coordinates'].Longitude;
      }
      const addr = loc.address || loc.Address;
      if (addr) e.address = String(addr);
      const rating = p.five_star_rating_published ?? p['Star Rating'] ?? p.rating;
      if (rating != null && Number.isFinite(+rating) && +rating > 0) {
        e.score = normScore(+rating, 5);
        e.list = 'been';
      } else if (p.review_text_published || /review|resena/i.test(fileName)) e.list = 'been';
      else e.list = list || 'want';
      const note = p.review_text_published || p.Comment || p.note;
      if (note) e.note = String(note).slice(0, 300);
      const url = p.google_maps_url || p['Google Maps URL'];
      if (url) e.url = String(url);
      out.push(e);
    }
    return dedupe(out);
  }
  if (d && Array.isArray(d.timelineObjects)) {
    for (const o of d.timelineObjects) {
      const l = o.placeVisit?.location;
      if (!l?.name) continue;
      out.push({ name: String(l.name), lat: l.latitudeE7 / 1e7, lon: l.longitudeE7 / 1e7, address: l.address, list: 'been', onlyIfMatched: true, visits: 1 });
    }
    return dedupe(out);
  }
  if (Array.isArray(d)) {
    const keys = [...new Set(d.slice(0, 20).flatMap((x: any) => (x && typeof x === 'object' ? Object.keys(x) : [])))] as string[];
    if (!keys.length) return parseListText(d.filter((x: any) => typeof x === 'string').join('\n'), { list });
    const rows = [keys, ...d.map((x: any) => keys.map((k) => (x?.[k] == null ? '' : typeof x[k] === 'object' ? JSON.stringify(x[k]) : String(x[k]))))];
    return entriesFromTable(rows, { list });
  }
  for (const k of ['places', 'restaurants', 'items', 'list', 'data', 'been', 'want']) {
    if (d && Array.isArray(d[k])) {
      const sub = entriesFromJson(d[k], fileName);
      return sub.map((e) => ({ ...e, list: e.list || (k === 'been' ? 'been' : k === 'want' ? 'want' : undefined) })).map((e) => (e.list ? e : (({ list: _l, ...r }) => r)(e)));
    }
  }
  return [];
}

/** Google My Maps / Earth KML placemarks. */
export function entriesFromKml(xml: string, fileName = ''): ImportEntry[] {
  const list = listFromFileName(fileName);
  const out: ImportEntry[] = [];
  const dec = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  for (const m of String(xml).matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)) {
    const pm = m[0];
    const name = dec(pm.match(/<name>([\s\S]*?)<\/name>/)?.[1] || '');
    if (!looksLikeName(name)) continue;
    const e: ImportEntry = { name, ...(list ? { list } : {}) };
    const c = pm.match(/<coordinates>\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (c) {
      e.lon = +c[1];
      e.lat = +c[2];
    }
    const desc = dec(pm.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '');
    if (desc) {
      const t = takeScore(desc);
      if (t.score != null) e.score = t.score;
      if (t.rest) e.note = t.rest.slice(0, 300);
    }
    out.push(e);
  }
  return dedupe(out);
}

/** Read one file by its name and contents (CSV, JSON, GeoJSON, KML, TXT). */
export function entriesFromFile(fileName: string, content: string): ImportEntry[] {
  const n = fileName.toLowerCase();
  const t = String(content || '').trim();
  if (n.endsWith('.kml') || t.startsWith('<?xml') || t.includes('<kml')) return entriesFromKml(t, fileName);
  if (n.endsWith('.json') || n.endsWith('.geojson') || t.startsWith('{') || t.startsWith('[')) {
    try {
      return entriesFromJson(JSON.parse(t), fileName);
    } catch {
      return parseListText(t, { list: listFromFileName(fileName) });
    }
  }
  if (n.endsWith('.csv') || n.endsWith('.tsv')) {
    const rows = parseCsv(t);
    const e = entriesFromTable(rows, { list: listFromFileName(fileName) });
    if (e.length) return e;
  }
  return parseListText(t, { list: listFromFileName(fileName) });
}
