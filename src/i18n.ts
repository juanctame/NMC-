/**
 * Lightweight in-app internationalization for CRTQ. Three languages, picked by
 * tapping a flag: English, Spanish, French. No external i18n library — the app
 * chrome is a small, fixed surface, so a flat dictionary of tuples keeps it
 * tree-shakeable and type-safe.
 *
 * Usage:
 *   const t = useT();            // reactive: re-renders when the flag changes
 *   <Text>{t('nav.guide')}</Text>
 *
 * The store owns the active `lang` (persisted to storage). `t(key)` falls back
 * to English, then to the key itself, so a missing translation is never blank.
 */
import { useStore } from './store/useStore';

export type Lang = 'en' | 'es' | 'fr';

/** Flag-first language menu. `flag` is the emoji shown in the picker. */
export const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const ORDER: Lang[] = ['en', 'es', 'fr'];

/**
 * The translated chrome. Each entry is [English, Español, Français]. Keys are
 * namespaced by screen so they stay easy to find. Proper nouns (CRTQ, city
 * names, cuisines, user content) are intentionally not translated.
 */
const STRINGS: Record<string, [string, string, string]> = {
  // ── bottom navigation ──
  'nav.guide': ['Guide', 'Guía', 'Guide'],
  'nav.table': ['Table', 'Mesa', 'Table'],
  'nav.you': ['You', 'Tú', 'Toi'],
  'nav.log': ['Log', 'Diario', 'Journal'],

  // ── onboarding ──
  'ob.tagline': [
    'Around the world · around the table',
    'Alrededor del mundo · alrededor de la mesa',
    'Autour du monde · autour de la table',
  ],
  'ob.blurb': [
    'Rank every place you eat, keep a passport of your city, and find your next table through the friends you actually trust.',
    'Clasifica cada lugar donde comes, guarda un pasaporte de tu ciudad y encuentra tu próxima mesa a través de los amigos en los que confías.',
    'Classez chaque endroit où vous mangez, gardez un passeport de votre ville et trouvez votre prochaine table grâce aux amis en qui vous avez confiance.',
  ],
  'ob.create': ['Create my passport →', 'Crea mi pasaporte →', 'Créer mon passeport →'],
  'ob.look': ['Just let me look around', 'Solo quiero echar un vistazo', 'Je veux juste regarder'],
  'ob.name': ['Your name', 'Tu nombre', 'Votre nom'],
  'ob.handle': ['Pick a handle', 'Elige un usuario', 'Choisissez un identifiant'],
  'ob.city': ['Your city', 'Tu ciudad', 'Votre ville'],
  'ob.tastes': ['What do you crave?', '¿Qué se te antoja?', 'Que désirez-vous ?'],
  'ob.stamp': ['Stamp my passport', 'Sella mi pasaporte', 'Tamponnez mon passeport'],
  'ob.continue': ['Continue', 'Continuar', 'Continuer'],
  'ob.handleFree': ['Available ✓', 'Disponible ✓', 'Disponible ✓'],
  'ob.handleTaken': ['Taken — try another', 'Ocupado — prueba otro', 'Pris — essayez-en un autre'],
  'ob.handleChecking': ['Checking…', 'Comprobando…', 'Vérification…'],

  // ── feed ──
  'feed.trending': ['Trending now', 'Tendencia ahora', 'Tendances du moment'],
  'feed.trendingSub': ['Most mentioned this month', 'Lo más mencionado del mes', 'Le plus mentionné ce mois'],
  'feed.clips': ['clips', 'clips', 'clips'],
  'feed.views': ['views', 'vistas', 'vues'],
  'feed.via': ['via', 'por', 'par'],
  'feed.onCrtq': ['On CRTQ', 'En CRTQ', 'Sur CRTQ'],
  'feed.tastemakers': ['Tastemakers to follow', 'Referentes a seguir', 'Prescripteurs à suivre'],
  'feed.fresh': ['Fresh near you', 'Nuevo cerca de ti', 'Nouveau près de vous'],
  'feed.reels': ['On the reel', 'En video', 'En vidéo'],

  // ── hashtag videos (place detail) ──
  'reel.section': ['On the reel', 'En video', 'En vidéo'],
  'reel.finding': ['Finding videos…', 'Buscando videos…', 'Recherche de vidéos…'],
  'reel.none': [
    'No in-app clips yet — open the live hashtag feed on any platform below.',
    'Aún no hay clips en la app — abre el feed del hashtag en cualquier plataforma abajo.',
    'Pas encore de clips dans l’app — ouvrez le fil du hashtag sur une plateforme ci-dessous.',
  ],

  // ── leaderboard / board ──
  'board.title': ['Leaderboard', 'Clasificación', 'Classement'],
  'board.sub': ['Ranked by the critics’ table', 'Clasificado por la mesa de críticos', 'Classé par la table des critiques'],
  'board.restaurants': ['Restaurants', 'Restaurantes', 'Restaurants'],
  'board.diners': ['Diners', 'Comensales', 'Convives'],
  'board.all': ['All', 'Todo', 'Tout'],

  // ── log / guide ──
  'log.been': ['Been', 'Visitados', 'Visités'],
  'log.want': ['Want to try', 'Por probar', 'À essayer'],
  'log.recs': ['Recs', 'Recos', 'Recos'],
  'log.title': ['Your guide', 'Tu guía', 'Votre guide'],

  // ── table / events ──
  'table.header': ['The Table', 'La Mesa', 'La Table'],
  'table.events': ['Events', 'Eventos', 'Événements'],
  'table.community': ['Community', 'Comunidad', 'Communauté'],
  'table.title': ['Tables', 'Mesas', 'Tables'],

  // ── passport / you ──
  'you.passport': ['Passport', 'Pasaporte', 'Passeport'],
  'you.account': ['Account', 'Cuenta', 'Compte'],
  'you.signout': ['Sign out', 'Cerrar sesión', 'Se déconnecter'],
  'you.signin': ['Sign in', 'Iniciar sesión', 'Se connecter'],
  'you.create': ['Create account', 'Crear cuenta', 'Créer un compte'],
  'you.stamps': ['Recent stamps', 'Sellos recientes', 'Tampons récents'],
  'you.verdicts': ['Recent verdicts', 'Veredictos recientes', 'Verdicts récents'],
  'you.language': ['Language', 'Idioma', 'Langue'],
  'you.rankCuisines': ['Where you rank cuisines', 'Cómo clasificas cocinas', 'Où vous classez les cuisines'],
  'you.chase': ['What you chase', 'Lo que buscas', 'Ce que vous cherchez'],
  'you.criticAccess': ['Critic access', 'Acceso de crítico', 'Accès critique'],
  // stat labels
  'stat.ranked': ['Ranked', 'Clasif.', 'Classés'],
  'stat.thisYear': ['This year', 'Este año', 'Cette année'],
  'stat.cuisines': ['Cuisines', 'Cocinas', 'Cuisines'],
  'stat.avg': ['Avg score', 'Prom.', 'Moy.'],
  'stat.verdicts': ['Verdicts', 'Veredictos', 'Verdicts'],
  'stat.events': ['Events', 'Eventos', 'Événements'],
  'stat.followers': ['Followers', 'Seguidores', 'Abonnés'],
  // ── taste identity (profile) ──
  'you.tasteId': ['Your taste identity', 'Tu identidad de sabor', 'Votre identité de goût'],
  'you.palate': ['Your palate', 'Tu paladar', 'Votre palais'],
  'you.flavorDna': ['Flavor DNA', 'Tu ADN de sabor', 'Votre ADN de goût'],
  'you.goto': ['Go-to order', 'Tu pedido de siempre', 'Votre commande fétiche'],
  'you.manifesto': ['My manifesto', 'Mi manifiesto', 'Mon manifeste'],
  'you.edit': ['Edit', 'Editar', 'Éditer'],
  'you.write': ['Write mine →', 'Escribir el mío →', 'Écrire le mien →'],
  'you.manifestoPrompt': ['What do you look for at a table?', '¿Qué buscas en una mesa?', 'Que cherchez-vous à table ?'],
  'axis.calle': ['Street', 'Calle', 'Rue'],
  'axis.mantel': ['Fine', 'Mantel', 'Nappe'],
  'axis.mar': ['Sea', 'Mar', 'Mer'],
  'axis.dulce': ['Sweet', 'Dulce', 'Sucré'],
  'axis.fuego': ['Fire', 'Fuego', 'Feu'],
  'axis.mundo': ['World', 'Mundo', 'Monde'],
  'arch.banqueta.t': ['Curb-side soul', 'Alma de banqueta', 'Âme du trottoir'],
  'arch.banqueta.b': ['The street and the small hours, before any tablecloth.', 'De la calle y la madrugada, antes que el mantel.', 'La rue et les petites heures, avant la nappe.'],
  'arch.mantel.t': ['Made for the tablecloth', 'Espíritu de mantel', 'Esprit de nappe'],
  'arch.mantel.b': ['Counted seats and long menus.', 'Barras contadas y menús largos.', 'Places comptées et longs menus.'],
  'arch.mar.t': ['Devoted to the sea', 'Devoción por el mar', 'Dévotion à la mer'],
  'arch.mar.b': ['The tostada before the steak.', 'La tostada antes que el filete.', 'La tostada avant le steak.'],
  'arch.dulce.t': ['The sweet route', 'Ruta dulce', 'La route sucrée'],
  'arch.dulce.b': ['Morning bread and coffee, no rush.', 'Pan de la mañana, café sin prisa.', 'Pain du matin, café sans hâte.'],
  'arch.fuego.t': ['Fire and tradition', 'Fuego y tradición', 'Feu et tradition'],
  'arch.fuego.b': ['Comal, coals, and the cantina.', 'Comal, brasa y cantina.', 'Comal, braises et cantina.'],
  'arch.trotamundos.t': ['Flavor globetrotter', 'Trotamundos del sabor', 'Globe-trotteur du goût'],
  'arch.trotamundos.b': ['A different kitchen every week.', 'Una cocina distinta cada semana.', 'Une cuisine différente chaque semaine.'],
  'arch.todoterreno.t': ['All-terrain palate', 'Paladar todo terreno', 'Palais tout-terrain'],
  'arch.todoterreno.b': ['From the taco to the tablecloth, no snobbery.', 'Del taco al mantel, sin prejuicios.', 'Du taco à la nappe, sans préjugés.'],
  'arch.nuevo.t': ['Blank passport', 'Pasaporte en blanco', 'Passeport vierge'],
  'arch.nuevo.b': ['Rank a few places and your taste takes shape.', 'Clasifica algunos lugares y tu paladar toma forma.', 'Classez quelques lieux et votre palais prend forme.'],
  'you.connect': ['Connect your account', 'Conecta tu cuenta', 'Connectez votre compte'],
  'you.connectSub': [
    'Sign in with your handle to sync your passport across devices.',
    'Inicia sesión con tu usuario para sincronizar tu pasaporte entre dispositivos.',
    'Connectez-vous avec votre identifiant pour synchroniser votre passeport.',
  ],
  'you.have': ['Already have a passport?', '¿Ya tienes pasaporte?', 'Déjà un passeport ?'],
  // ── auth (Google sign-in) ──
  'auth.google': ['Continue with Google', 'Continúa con Google', 'Continuer avec Google'],
  'auth.or': ['or', 'o', 'ou'],
  'auth.failed': ['Sign-in failed — please try again.', 'Error al iniciar sesión — inténtalo de nuevo.', 'Échec de la connexion — réessayez.'],
  'you.googleAccount': ['Google account', 'Cuenta de Google', 'Compte Google'],
  'you.connectCta': ['Connect →', 'Conectar →', 'Se connecter →'],
  'you.enterHandle': ['Your handle (e.g. @june)', 'Tu usuario (ej. @june)', 'Votre identifiant (ex. @june)'],
  'you.notFound': [
    'No account found for that handle.',
    'No se encontró ninguna cuenta con ese usuario.',
    'Aucun compte trouvé pour cet identifiant.',
  ],
  'you.checking': ['Connecting…', 'Conectando…', 'Connexion…'],
  'common.back': ['Back', 'Atrás', 'Retour'],

  // ── nearby / map ──
  'map.nearby': ['Nearby', 'Cerca', 'À proximité'],
  'map.grades': ['Grades', 'Notas', 'Notes'],
  'map.events': ['Events', 'Eventos', 'Événements'],
  'map.tables': ['Tables', 'Mesas', 'Tables'],

  // ── common ──
  'common.close': ['Close', 'Cerrar', 'Fermer'],
  'common.save': ['Save', 'Guardar', 'Enregistrer'],
  'common.cancel': ['Cancel', 'Cancelar', 'Annuler'],
  'common.done': ['Done', 'Listo', 'Terminé'],
  'common.search': ['Search', 'Buscar', 'Rechercher'],
  'common.openNow': ['Open now', 'Abierto ahora', 'Ouvert'],
  'common.closed': ['Closed', 'Cerrado', 'Fermé'],
  'common.rank': ['Rank it', 'Clasificar', 'Classer'],
  'common.review': ['Review', 'Reseña', 'Avis'],
};

/** Translate a key into the given language, falling back to EN then the key. */
export function t(key: string, lang: Lang): string {
  const row = STRINGS[key];
  if (!row) return key;
  const i = ORDER.indexOf(lang);
  return row[i] || row[0] || key;
}

/** Reactive translator bound to the store's current language. */
export function useT(): (key: string) => string {
  const lang = useStore((s) => s.lang);
  return (key: string) => t(key, lang);
}
