/**
 * Shared relevance rule for full-text sources (Dailymotion, Wikimedia Commons,
 * Internet Archive): is this clip / photo really about this venue? Used by
 * collect-clips-open.mjs and collect-media.mjs.
 */
export const fold = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// ── relevance for full-text sources ─────────────────────────────────────────
// Dailymotion / Commons / Archive search full text, so a venue whose name is an
// ordinary word ("Máximo", "Hugo", "Mesa", "Kill Bill") pulls in news, songs and
// films. A clip counts as about the venue only when the venue's name is in its
// title AND the context says restaurant + Mexico City as needed:
//  - generic names need both a food cue and a CDMX cue;
//  - one-word names need one of them;
//  - distinctive multi-word names ("Comedor Jacinta") need neither;
//  - CDMX food outlets (Gourmet de México, Chilango, Dónde Ir…) count as both;
//  - anything placed in another city (and not in CDMX) is dropped.
export const GENERIC = new Set(
  [
    'em', 'maximo', 'nicos', 'gaba', 'rosetta', 'ajoblanco', 'al andalus', 'alfil', 'arango', 'baldio', 'botanico', 'cana', 'cascabel',
    'chapulin', 'cuina', 'eloise', 'emilio', 'fierro', 'galea', 'lina', 'lorea', 'los danzantes', 'marea', 'migrante', 'prendes', 'raiz',
    'sarde', 'sartoria', 'sesame', 'the palm', 'tierra adentro', 'tori', 'vega', 'voraz', 'another', 'bajel', 'brutal', 'bulla', 'charco',
    'chevere', 'el bajio', 'el cardenal', 'filigrana', 'fugaz', 'fugu', 'gia', 'hank s', 'hugo', 'issi', 'kill bill', 'la 89', 'la cabrera',
    'liona', 'los panchos', 'lotti', 'magazzino', 'maleza', 'martinez', 'mistral', 'plumbago', 'propio', 'sin nombre', 'tenampa',
    'the lamb', 'vigneron', 'xuna', 'ideal', 'boca grande', 'cursi', 'enzu', 'max', 'mesa', 'tosco', 'entremar', 'mattea', 'limosneros',
  ],
);
export const FOOD =
  /restaurant|restaurante|taquer|\btacos?\b|comida|cocina|\bchefs?\b|\bmenu\b|gourmet|\bfood|foodie|cantina|panader|brunch|critica|michelin|50 best|platillo|gastronom|garnacha|donde ir|bistr|mezcal|tequila|\bbar\b|desayun|\bfonda\b|comedor|chilango|maspormas|time out|local traveller|conde nast|food and wine|\bcomer\b|sabor|chile en nogada|\bmole\b|pozole|tamal|barbacoa|antojit|cerveza|vino|wine|cocktail|coctel|sushi|ramen|pizza|pan dulce/;
export const CDMX =
  /\bcdmx\b|ciudad de mexico|mexico city|\bdf\b|chilango|zocalo|polanco|roma norte|roma sur|condesa|coyoacan|azcapotzalco|claveria|narvarte|juarez|cuauhtemoc|san rafael|san angel|santa maria la ribera|santa fe|lomas de chapultepec|chapultepec|tabacalera|anzures|pedregal|portales|del valle|iztacalco|iztapalapa|tlalpan|xochimilco|miguel hidalgo|benito juarez|alvaro obregon|garibaldi|reforma|insurgentes|centro historico/;
export const ELSEWHERE =
  /puebla|monterrey|guadalajara|tijuana|queretaro|cancun|merida|bolivia|barcelona|spain|espana|madrid|dubai|florida|santo domingo|dominican|argentina|buenos aires|colombia|bogota|italia|italy|paris|france|new york|miami|texas|california|venezuela|costa rica|honduras|guatemala|satelite|naucalpan/;
export const TRUSTED = /gourmet de mexico|chilango|donde ir|maspormas|la ruta de la garnacha|time out|food and wine|conde nast|local traveller/;

export const words = (s) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim();

export function strictAbout(v, { title, description = '', creator = '' }) {
  const name = words(v.name);
  if (!name || !(' ' + words(title) + ' ').includes(' ' + name + ' ')) return false;
  // the context, minus the venue's own name (so "Guzina Oaxaca" isn't "elsewhere")
  const ctx = (' ' + words([title, description, creator].join(' ')) + ' ').split(' ' + name + ' ').join(' ');
  const food = FOOD.test(ctx);
  const city = CDMX.test(ctx) || (!!v.hood && ctx.includes(words(v.hood)));
  if (!city && ELSEWHERE.test(ctx)) return false;
  // the venue's own chef named alongside it ("Gabriela Cámara … Contramar")
  const chef = words(String(v.chef || '').split(/[,(/]| y /)[0]);
  if (chef.split(' ').length >= 2 && ctx.includes(' ' + chef + ' ')) return true;
  if (GENERIC.has(name)) {
    // A CDMX food outlet's episode titled after the venue ("ARANGO | Gourmet de México")
    // counts; otherwise a generic name needs a food cue in the title and a CDMX cue.
    const rest = (' ' + words(title) + ' ').split(' ' + name + ' ').join(' ').trim();
    if (TRUSTED.test(words(creator))) return !rest || FOOD.test(' ' + rest + ' ') || CDMX.test(' ' + rest + ' ');
    return FOOD.test(' ' + words(title) + ' ') && city;
  }
  if (TRUSTED.test(words(creator))) return true;
  const sig = name.split(' ').filter((w) => !['el', 'la', 'los', 'las', 'the', 'de', 'del', 'y'].includes(w));
  if (sig.length >= 2) return true;
  return food || city;
}

