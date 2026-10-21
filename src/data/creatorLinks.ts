/**
 * What we know about real creators beyond their clips — only facts with a
 * source. A critic's connected accounts start from the accounts their own clips
 * were posted from (proof enough); anything listed here was checked separately
 * and carries the page that confirms it. Reported opinions are things a creator
 * said that the press wrote up, paraphrased and linked — never invented quotes.
 *
 * Keys are the normalized handle (critics.ts `keyOf`).
 */

export type ExtraLink = { platform: 'instagram' | 'web' | 'youtube' | 'tiktok'; label: string; url: string; source?: string };

export type ReportedTake = {
  placeId: string;
  verdict: 'rave' | 'recommends' | 'critical';
  /** Paraphrase of what they said, in the third person. */
  text: string;
  /** Where it was reported. */
  outlet: string;
  url: string;
  date?: string; // ISO day, when known
};

export type CreatorExtra = {
  /** Display name when the platform's own is a bare handle. */
  name?: string;
  kind?: 'creator' | 'outlet';
  bio?: string;
  bioSource?: string;
  links?: ExtraLink[];
  reported?: ReportedTake[];
};

export const CREATOR_EXTRA: Record<string, CreatorExtra> = {
  andersandkaitlin: {
    name: 'Anders & Kaitlin',
    bio: 'Anders Husa and Kaitlin Orr — Copenhagen-based restaurant bloggers and World’s 50 Best TasteHunters.',
    bioSource: 'https://andershusa.com/about/',
    links: [
      { platform: 'web', label: 'andershusa.com', url: 'https://andershusa.com', source: 'https://andershusa.com/about/' },
      { platform: 'instagram', label: '@andershusa', url: 'https://www.instagram.com/andershusa/', source: 'https://andershusa.com/about/' },
      { platform: 'instagram', label: '@carnivorr', url: 'https://www.instagram.com/carnivorr/', source: 'https://andershusa.com/about/' },
    ],
  },
  soyelarturito: {
    name: 'El Arturito',
    bio: 'Mexican taco and street-food reviewer whose verdicts regularly make the news.',
    bioSource: 'https://www.adn40.mx/tiempo-libre/2026-01-28/un-destacado-influencer-en-gastronomia-asegura-que-el-mejor-taco-suadero/',
    reported: [
      {
        placeId: 'cx-tacos-charly',
        verdict: 'rave',
        text: 'Named it the place for the best suadero in the country — slow-cooked meat and a smoky red salsa.',
        outlet: 'ADN40',
        url: 'https://www.adn40.mx/tiempo-libre/2026-01-28/un-destacado-influencer-en-gastronomia-asegura-que-el-mejor-taco-suadero/',
        date: '2026-01-28',
      },
    ],
  },
  luiscarloszara: { name: 'Luis Carlos Zara' },
  chilango: {
    kind: 'outlet',
    links: [{ platform: 'web', label: 'chilango.com', url: 'https://www.chilango.com' }],
    reported: [
      {
        placeId: 'cx-tacos-charly',
        verdict: 'rave',
        text: 'Calls its suadero the most celebrated in the city — though regulars also come for cabeza, sesos and lengua.',
        outlet: 'Chilango',
        url: 'https://www.chilango.com/comida-y-tragos/tacos-de-menudencias/',
      },
    ],
  },
  gourmetmx: { kind: 'outlet', name: 'Gourmet de México' },
  milenio: { kind: 'outlet', name: 'Milenio', links: [{ platform: 'web', label: 'milenio.com', url: 'https://www.milenio.com' }] },
  revistadondeir: { kind: 'outlet', links: [{ platform: 'web', label: 'dondeir.com', url: 'https://www.dondeir.com' }] },
  maspormas: { kind: 'outlet', links: [{ platform: 'web', label: 'maspormas.com', url: 'https://www.maspormas.com' }] },
  heraldodemexico: { kind: 'outlet', links: [{ platform: 'web', label: 'heraldodemexico.com.mx', url: 'https://heraldodemexico.com.mx' }] },
  eleconomistatv: { kind: 'outlet', links: [{ platform: 'web', label: 'eleconomista.com.mx', url: 'https://www.eleconomista.com.mx' }] },
  foodandwineespanol: { kind: 'outlet', links: [{ platform: 'web', label: 'foodandwineespanol.com', url: 'https://foodandwineespanol.com' }] },
  condenasttraveler: { kind: 'outlet', links: [{ platform: 'web', label: 'cntraveler.com', url: 'https://www.cntraveler.com' }] },
  elpais: { kind: 'outlet', links: [{ platform: 'web', label: 'elpais.com', url: 'https://elpais.com' }] },
  the50global: { kind: 'outlet', name: 'The World’s 50 Best', links: [{ platform: 'web', label: 'theworlds50best.com', url: 'https://www.theworlds50best.com' }] },
};

/**
 * General news — wires, TV news, business and national press. They report on
 * restaurants (an award, a queue, an opening) but aren't critics: their clips
 * stay in the clip feeds; they don't get a critic profile or a say in a
 * restaurant's critic consensus.
 */
export const NEWS_RE =
  /milenio|imagen (noticias|entretenimiento|tv)|imagennoticias|imagenentretenimiento|inclusive ?tv|heraldo de mexico|heraldodemexico|economista|excelsior|nccib|pagina ?12|el pais|elpais|swns|azteca|financiero|cbs|\bafp\b|est media|business luxury|\bnoticias\b|\bnews\b/;

/** Food media, city magazines and media brands — shown as outlets, not personal creators. */
export const OUTLET_RE =
  /milenio|imagen|heraldo|economista|food and wine|donde ir|gourmet de mexico|chilango|excelsior|nccib|conde nast|pagina ?12|el pais|swns|maspormas|inclusive tv|business luxury|azteca|financiero|cbs|afp|the 50|est media|gastrolab|life & thyme|local traveller|noticias|\btv\b|media/;
