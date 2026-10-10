import sys, json, re, unicodedata, collections
import openpyxl

SRC = sys.argv[1]
OUT = sys.argv[2]
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)

def sheet_rows(name):
    ws = wb[name]
    data = [list(r) for r in ws.iter_rows(values_only=True)]
    hdr = [("" if c is None else str(c)).strip() for c in data[0]]
    out = []
    for r in data[1:]:
        if not any(c not in (None, "") for c in r):
            continue
        out.append({hdr[i]: r[i] for i in range(min(len(hdr), len(r)))})
    return out

def s(v):
    if v is None: return ""
    return str(v).strip()

def slug(name):
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    n = re.sub(r"[^a-zA-Z0-9]+", "-", n).strip("-").lower()
    return n or "sitio"

# Spanish category -> broad app cuisine (CUISINES vocabulary)
CUISINE = {
    "Alta cocina mexicana": "Fine Dining",
    "Mexicana contemporánea": "Contemporary",
    "Cocina de autor": "Contemporary",
    "Cocina de fusión": "Contemporary",
    "Cocina europea": "Contemporary",
    "Cocina tradicional mexicana": "Mexican",
    "Cocina regional mexicana": "Mexican",
    "Taquería": "Mexican",
    "Taquería de autor": "Mexican",
    "Maíz y antojería": "Mexican",
    "Mariscos": "Seafood",
    "Asiática": "Japanese",
    "Española y mediterránea": "Mediterranean",
    "Medio Oriente": "Mediterranean",
    "Italiana": "Italian",
    "Pizzería": "Pizza",
    "Francesa y bistró": "French",
    "Parrilla y brasa": "Steakhouse",
    "Bar de vinos con cocina": "Bar",
    "Cantina": "Bar",
    "Comida casual y brunch": "Brunch",
    "Vegetariana": "Vegetarian",
}
def map_cuisine(cat):
    if cat in CUISINE: return CUISINE[cat]
    c = cat.lower()
    for key, kw in [("Mexican",["mexic","taqu","maíz","antoj"]),("Seafood",["marisc","pesc"]),
                    ("Japanese",["asiát","japon","sushi","nikkei"]),("Italian",["italian","pasta"]),
                    ("Pizza",["pizz"]),("French",["franc","bistró","bistro"]),("Steakhouse",["parrilla","brasa","corte","asad"]),
                    ("Mediterranean",["mediterr","españ","medio oriente","libanes"]),("Bar",["bar","cantina","vino","mezcal"]),
                    ("Brunch",["brunch","desayuno"]),("Café",["café","cafe"]),("Bakery",["panad","reposter"]),
                    ("Vegetarian",["vegetar","vegan"]),("Contemporary",["autor","contempor","fusión","europ"])]:
        if any(k in c for k in kw): return key
    return "Contemporary"

# Guide / press outlets behind each "Enlaces de fuente" link (by domain).
OUTLETS = [
    ("guide.michelin.com", "Guía Michelin"), ("chilango.com", "Chilango"),
    ("timeoutmexico.mx", "Time Out México"), ("elfinanciero.com.mx", "El Financiero"),
    ("foodandpleasure.com", "Food and Pleasure"), ("thehappening.com", "The Happening"),
    ("mex-best.mx", "Mex Best"), ("opentable", "OpenTable"), ("nmas.com.mx", "N+"),
    ("theinfatuation.com", "The Infatuation"), ("expansion.mx", "Life and Style"),
    ("panoramaweb.com.mx", "Panorama"), ("wikipedia.org", "Wikipedia"),
]
def sources(raw):
    out, seen = [], set()
    for u in re.findall(r"https?://[^\s|;,]+", raw or ""):
        u = u.rstrip(").")
        if "inegi.org.mx" in u or u in seen:
            continue  # INEGI DENUE is a data registry, not media
        seen.add(u)
        outlet = next((n for d, n in OUTLETS if d in u), re.sub(r"^https?://(www\.)?", "", u).split("/")[0])
        out.append({"outlet": outlet, "url": u})
    return out

TICKET_MID = {"Menos de 400": 300, "400 a 1,000": 700, "1,000 a 2,000": 1500, "Más de 2,000": 2800}

def acclaim(rec, level, moment):
    r = (rec or "").lower()
    v = 70
    if "3 estrella" in r: v = 100
    elif "2 estrella" in r: v = 96
    elif "1 estrella" in r: v = 90
    elif "bib gourmand" in r: v = 83
    elif "seleccionado" in r or "selected" in r: v = 77
    if "50 best" in r: v = min(100, v + 4)
    lv = (level or "")
    if lv == "Referente internacional": v = max(v, 86)
    elif lv == "Prensa · aperturas": v = min(v, 68)
    if (moment or "") == "Trayectoria": v = min(100, v + 2)
    return max(60, min(100, v))

def build(rows, is_radar=False):
    seen = {}
    out = []
    for x in rows:
        name = s(x.get("Nombre"))
        if not name: continue
        cat = s(x.get("Categoría"))
        rec = {}
        sid = "cx-" + slug(name)
        if sid in seen:
            seen[sid] += 1; sid = f"{sid}-{seen[sid]}"
        else:
            seen[sid] = 1
        rec["id"] = sid
        rec["name"] = name
        rec["cuisine"] = map_cuisine(cat)
        if cat: rec["category"] = cat
        hood = s(x.get("Colonia")) or s(x.get("Alcaldía")) or "CDMX"
        rec["hood"] = hood
        bor = s(x.get("Alcaldía"))
        if bor: rec["borough"] = bor
        price = s(x.get("Rango de precio")) or "$$"
        rec["price"] = price
        rec["addr"] = s(x.get("Dirección")) or name
        blurb = s(x.get("Reseña"))
        rec["blurb"] = blurb or f"{cat or 'Cocina'} en {hood}."
        dishes = [d.strip() for d in re.split(r"\s·\s|·|\n", s(x.get("Qué pedir"))) if d.strip()]
        if dishes: rec["dishes"] = dishes[:5]
        tip = s(x.get("Consejo"))
        if tip: rec["tip"] = tip
        occ = s(x.get("Ideal para"))
        if occ: rec["occasion"] = occ
        chef = s(x.get("Chef o equipo"))
        if chef: rec["chef"] = chef
        moment = s(x.get("Momento"))
        if moment: rec["moment"] = moment
        why = s(x.get("Por qué destaca ahora"))
        if why: rec["why"] = why
        level = s(x.get("Nivel de reconocimiento"))
        if level: rec["recognition"] = level
        awards = s(x.get("Reconocimientos"))
        if awards: rec["awards"] = awards
        rec["acclaim"] = acclaim(awards, level, moment)
        ticket = s(x.get("Ticket estimado por persona (MXN)"))
        if ticket:
            rec["ticket"] = ticket
            if ticket in TICKET_MID: rec["ticketMid"] = TICKET_MID[ticket]
        ig = s(x.get("Instagram"))
        if ig: rec["instagram"] = ig
        web = s(x.get("Sitio web"))
        if web: rec["website"] = web if web.startswith("http") else "https://" + web
        src = sources(s(x.get("Enlaces de fuente")))
        if src: rec["sources"] = src
        tel = s(x.get("Teléfono"))
        if tel: rec["phone"] = tel
        lat = s(x.get("Latitud")); lon = s(x.get("Longitud"))
        try:
            if lat and lon:
                rec["lat"] = round(float(lat), 6); rec["lon"] = round(float(lon), 6)
        except ValueError:
            pass
        out.append(rec)
    return out

main = build(sheet_rows("Restaurantes"))
# de-dup against main, add radar entries not already present
main_names = {r["name"].lower() for r in main}
radar = [r for r in build(sheet_rows("Radar 2025–2026")) if r["name"].lower() not in main_names]
allrecs = main + radar

print(f"Restaurantes={len(main)}  radar-extra={len(radar)}  total={len(allrecs)}")
print("with coords:", sum(1 for r in allrecs if "lat" in r))
print("cuisines:", dict(collections.Counter(r["cuisine"] for r in allrecs)))

body = json.dumps(allrecs, ensure_ascii=False, indent=0)
ts = '''/**
 * CDMX restaurant dataset — AUTO-GENERATED from the curated "Carte" workbook
 * (Guía Michelin 2026 · 50 Best 2025 · Guía México Gastronómico 2026 · INEGI
 * DENUE 05/2026). Do not edit by hand; regenerate from the source spreadsheet.
 *
 * These are real, current CDMX venues with real dishes ("what to order"),
 * per-person price bands, chefs, neighbourhoods, coordinates, and awards. They
 * power the CDMX demo so the app is full and up to date without any live API.
 * `acclaim` (0–100) is a prestige index derived from the real awards; it stands
 * in for a crowd rating here (we never fabricate a Google star).
 */
import type { Place } from '../store/data';
import { PHOTO_POOL } from '../assets';

const RAW: Omit<Place, 'photo' | 'openInfo'>[] = __BODY__;

function h(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

/** The full curated CDMX set, each given a stock photo + source tag. */
export const CARTE_CDMX: Place[] = RAW.map((r) => ({
  ...r,
  photo: PHOTO_POOL[h(r.id) % PHOTO_POOL.length],
  openInfo: '',
  source: 'carte' as const,
  rated: false,
}));

/** New & rising spots (2026 openings and recently acclaimed), best first. */
export const CARTE_RISING: Place[] = CARTE_CDMX.filter(
  (p) => p.moment === 'Apertura 2026' || p.moment === 'En ascenso',
).sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0));
'''.replace("__BODY__", body)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(ts)
print("wrote", OUT, "chars:", len(ts))
