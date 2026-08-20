/**
 * Channels as working chats. The charter (../data/charter) describes the five
 * CRTQ channels and gives each a plantilla; this module turns those templates
 * into an actual posting form, defines what a channel post is, seeds each
 * channel with a couple of example posts, and colours each post by its kind.
 *
 * Everything is in Spanish, matching the members' code. Posts are local-first
 * (persisted on-device); the same ChannelPost shape can later sync through a
 * shared backend the way reviews do.
 */
import { CHANNELS, VERDICTS } from './charter';
import { C } from '../theme/tokens';

export type FieldKind = 'choice' | 'text' | 'geo';
export type ChannelField = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  multiline?: boolean;
};

export type ChannelPost = {
  id: string;
  channel: string; // '#RECS'
  author: string;
  handle: string;
  initials: string;
  color: string;
  kind?: string; // chosen verdict/tag, e.g. 'Vale el viaje' or 'APERTURA'
  fields: { label: string; value: string }[];
  createdAt: number;
};

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'campo';
}

const MULTILINE = ['qué', 'que ', 'detalle', 'por qué', 'volvería', 'ya descarté'];
function isMultiline(label: string): boolean {
  const l = label.toLowerCase();
  return MULTILINE.some((m) => l.startsWith(m));
}

/**
 * Parse a channel's plantilla lines into form fields:
 *  - "[A · B · C]" / "[VEREDICTO o AVISO]"  → a choice (the post's kind)
 *  - "Etiqueta: a / b / c"                   → a choice
 *  - "Etiqueta: [pista]" / "Etiqueta:"       → a text field (multiline for the
 *     narrative ones)
 *  - "Lugar · colonia · ciudad"              → a single geo-sello line
 * A channel with no template (the general chat) gets one free-text message.
 */
export function parseTemplate(lines: string[]): ChannelField[] {
  if (!lines.length) {
    return [{ key: 'mensaje', label: 'Mensaje', kind: 'text', multiline: true, placeholder: 'Escribe al canal…' }];
  }
  const fields: ChannelField[] = [];
  lines.forEach((line, i) => {
    const bracket = line.match(/^\[(.+)\]$/);
    if (bracket) {
      const inner = bracket[1].trim();
      let options: string[];
      if (inner.includes('·')) options = inner.split('·').map((s) => s.trim());
      else if (/veredicto/i.test(inner)) options = [...VERDICTS.map((v) => v.name), 'AVISO'];
      else options = [inner]; // a fixed tag like EVENTO
      fields.push({ key: 'kind', label: '', kind: 'choice', options });
      return;
    }
    const idx = line.indexOf(':');
    if (idx > 0) {
      const label = line.slice(0, idx).trim();
      const rest = line
        .slice(idx + 1)
        .trim()
        .replace(/^\[|\]$/g, '')
        .trim();
      if (rest && /[·/]/.test(rest)) {
        const options = rest.split(/[·/]/).map((s) => s.trim()).filter(Boolean);
        fields.push({ key: slug(label) + '_' + i, label, kind: 'choice', options });
      } else {
        fields.push({ key: slug(label) + '_' + i, label, kind: 'text', placeholder: rest || undefined, multiline: isMultiline(label) });
      }
    } else {
      // composite line with no colon → a single geo/date input
      fields.push({ key: slug(line) + '_' + i, label: line, kind: 'geo', placeholder: line });
    }
  });
  return fields;
}

/** The channel's parsed form, memoized by tag. */
const FORMS: Record<string, ChannelField[]> = {};
export function channelForm(tag: string): ChannelField[] {
  if (!FORMS[tag]) {
    const ch = CHANNELS.find((c) => c.tag === tag);
    FORMS[tag] = parseTemplate(ch ? ch.template : []);
  }
  return FORMS[tag];
}

/** Colour a post by its kind (verdict weight / scoop / event). */
export function kindStyle(kind?: string): { bg: string; fg: string } {
  switch (kind) {
    case 'Imprescindible':
      return { bg: C.stampGreen, fg: C.greenFg };
    case 'Vale el viaje':
      return { bg: C.sun400, fg: C.inkDeep };
    case 'De paso':
      return { bg: C.paper200, fg: C.inkDeep };
    case 'AVISO':
      return { bg: C.ink400, fg: C.paper0 };
    case 'APERTURA':
    case 'CAMBIO':
      return { bg: C.stampBlue, fg: C.blueFg };
    case 'CIERRE':
      return { bg: C.ink500, fg: C.paper0 };
    case 'RUMOR':
      return { bg: C.paper200, fg: C.inkDeep };
    default:
      return { bg: C.sun400, fg: C.inkDeep };
  }
}

/** Compact "hace 3 h" style relative time in Spanish. */
export function agoEs(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return `hace ${Math.round(d / 7)} sem`;
}

const day = 24 * 60 * 60 * 1000;
const P = (
  id: string,
  channel: string,
  author: string,
  handle: string,
  initials: string,
  color: string,
  ageDays: number,
  kind: string | undefined,
  fields: [string, string][]
): ChannelPost => ({
  id,
  channel,
  author,
  handle,
  initials,
  color,
  kind,
  fields: fields.map(([label, value]) => ({ label, value })),
  createdAt: Date.now() - ageDays * day,
});

/** A couple of in-voice example posts per channel so the chats aren't empty. */
export const SEED_CHANNEL_POSTS: ChannelPost[] = [
  // #RECS
  P('rc1', '#RECS', 'Rosa Méndez', '@rosam', 'RM', 'var(--sun-500)', 0.2, 'Imprescindible', [
    ['Lugar · colonia · ciudad', 'El Vilsito · Narvarte · CDMX'],
    ['Fecha · éramos · por persona', '12 ago · 3 · $180'],
    ['Qué pedimos', 'Suadero, al pastor, un campechano.'],
    ['Qué funcionó', 'El pastor del trompo a la 1am, sin discusión.'],
    ['Volvería para', 'Lo mismo, otra madrugada.'],
    ['Declaración', 'cuenta pagada'],
  ]),
  P('rc2', '#RECS', 'Diego Fuentes', '@dief', 'DF', 'var(--stamp-blue)', 1.1, 'AVISO', [
    ['Lugar · colonia · ciudad', 'Un lugar nuevo · Roma · CDMX'],
    ['Fecha · éramos · por persona', '9 ago · 2 · $420'],
    ['Qué no', 'Reserva a las 9, nos sentaron 9:50, la cocina cerró antes del postre.'],
    ['Declaración', 'cuenta pagada'],
  ]),
  // #ASKS
  P('ak1', '#ASKS', 'Mariana López', '@maril', 'ML', 'var(--stamp-green)', 0.4, undefined, [
    ['Busco', 'Mariscos sin mantel, de banqueta.'],
    ['Zona', 'Narvarte o Del Valle'],
    ['Presupuesto por persona', '$250'],
    ['Ocasión', 'con amigos'],
    ['Ya descarté', 'Contramar (ya fui, va aparte en RECS)'],
  ]),
  // #SCOOPS
  P('sc1', '#SCOOPS', 'Sofía Reyes', '@sofr', 'SR', 'var(--stamp-pink)', 0.6, 'APERTURA', [
    ['Lugar o proyecto · colonia · ciudad', 'Barra de omakase · Juárez · CDMX'],
    ['Confirmación', 'probable'],
    ['Fuente', 'me lo dijeron'],
    ['Fecha estimada', 'octubre'],
    ['Detalle', 'Seis asientos, sin letrero todavía. El local lleva vacío desde marzo.'],
  ]),
  // #EVENTS
  P('ev1', '#EVENTS', 'Andrés Vega', '@andv', 'AV', 'var(--ink-400)', 0.9, 'EVENTO', [
    ['Nombre · lugar · colonia · ciudad', 'Cena a cuatro manos · Expendio · Roma · CDMX'],
    ['Fecha y hora', 'Jue 28 · 20:00'],
    ['Costo', '$900 · requiere boleto'],
    ['Quién participa', 'Dos cocinas de barrio, una noche.'],
    ['Por qué vale la pena', 'No se va a repetir el menú.'],
  ]),
  // #DINECLUB (general chat)
  P('dc1', '#DINECLUB', 'Rosa Méndez', '@rosam', 'RM', 'var(--sun-500)', 0.1, undefined, [
    ['Mensaje', 'Abro tres candidatos para el próximo martes: barra en Narvarte, un molino a las 7am, o recorrido de banqueta en la Doctores. Voten 👇'],
  ]),
];
