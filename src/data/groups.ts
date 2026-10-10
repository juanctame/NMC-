/**
 * Restaurant groups (grupos restauranteros) — derived at runtime from the curated
 * CDMX guide, the same way chef profiles are.
 *
 * We only link restaurants that the guide itself ties together, and every group
 * keeps the guide's own words as evidence. The signals:
 *  - a named group:            "del Grupo Castellano", "(Grupo Casamata)", "del grupo Pujol"
 *  - a sister/parent statement: "hermano de Rosetta y Lardo", "del equipo de Hugo Wine Bar",
 *                               "de los creadores de Choza", "por los chefs de Siembra Comedor",
 *                               "segundo proyecto de la chef de Cana", "el chef de Máximo"
 *  - "El grupo tiene otras sedes como Azul Condesa y Azulísimo"
 *  - a chef credit flagged "(grupo)" — the chef's other venues share the group
 *  - the same official website (pujol.com.mx, siempresiembra.com.mx)
 *
 * Plain name mentions are NOT links (Em's blurb mentions "Martínez" only as the
 * chef's surname), and neither are branches of one restaurant ("varias sedes").
 * Sister venues the guide names but doesn't list (Lardo, Fauna, Choza…) are kept
 * as "also in the family". Groups the guide names keep that name ("Grupo
 * Castellano"); otherwise we describe them as "<flagship> family", never
 * inventing a corporate name.
 */
import type { Place } from '../store/data';
import { CARTE_CDMX } from './carte';
import { chefForPlace, guideBadgeOf } from './chefs';

export type GroupKind = 'named' | 'family';

export type Group = {
  id: string; // 'group-<slug>'
  name: string; // "Grupo Castellano" | "Rosetta family"
  crest: string; // text the monogram crest is drawn from
  kind: GroupKind; // a group the guide names vs. sister restaurants
  placeIds: string[]; // member venues in the guide (most acclaimed first)
  also: string[]; // sister venues the guide names that aren't in it
  evidence: { placeId: string; text: string }[]; // the guide's own words
  chefIds: string[]; // chef profiles involved (cross-link)
  acclaim: number;
  topAward: string;
  cuisines: string[];
  hoods: string[];
};

/** Comparison key for venue names: lowercase, no accents, punctuation → space. */
function vkey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(s: string): string {
  return vkey(s).replace(/\s+/g, '-') || 'group';
}

const STOP = new Set(['el', 'la', 'los', 'las', 'the', 'de', 'del', 'restaurante', 'taqueria', 'tacos', 'cafe', 'bar']);

// ── Index the guide ─────────────────────────────────────────────────────────
const BY_ID: Record<string, Place> = {};
const BY_KEY: Record<string, Place> = {};
CARTE_CDMX.forEach((p) => {
  BY_ID[p.id] = p;
  BY_KEY[vkey(p.name)] = p;
});

/** Resolve a name the guide mentions to a venue in it: exact, else "Hugo Wine Bar" → "Hugo". */
function resolveVenue(ref: string): Place | undefined {
  const r = vkey(ref);
  if (!r) return undefined;
  if (BY_KEY[r]) return BY_KEY[r];
  let best: Place | undefined;
  for (const k of Object.keys(BY_KEY)) {
    if (r.startsWith(k + ' ') && (!best || k.length > vkey(best.name).length)) best = BY_KEY[k];
  }
  return best;
}

/** The sentence of `text` that contains index `i` (the guide's own words). */
function sentenceAt(text: string, i: number): string {
  const start = Math.max(0, text.lastIndexOf('. ', i) + (text.lastIndexOf('. ', i) >= 0 ? 2 : 0));
  const dot = text.indexOf('.', i);
  const end = dot >= 0 ? dot + 1 : text.length;
  return text.slice(start, end).trim();
}

function splitNames(s: string): string[] {
  return s
    .split(/\s*,\s*|\s+y\s+|\s+e\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function domainOf(url?: string): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

// ── Union-find over venues (+ named-group nodes) ────────────────────────────
const parent: Record<string, string> = {};
function find(x: string): string {
  if (parent[x] === undefined) parent[x] = x;
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]];
    x = parent[x];
  }
  return x;
}
function union(a: string, b: string) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent[rb] = ra;
}

const linked = new Set<string>(); // venues with at least one group signal
const namedOf: Record<string, string> = {}; // 'G:<key>' → "Grupo X"
const parentRefs: { placeId: string; label: string; resolved: boolean }[] = [];
const externals: { placeId: string; name: string }[] = [];
const evidence: { placeId: string; text: string }[] = [];

function link(p: Place, node: string, text: string) {
  union(p.id, node);
  linked.add(p.id);
  if (!node.startsWith('G:')) linked.add(node);
  if (text && !evidence.some((e) => e.placeId === p.id && e.text === text)) evidence.push({ placeId: p.id, text });
}

const NAME = '[A-ZÁÉÍÓÚÑ][^.;,]*?';
const STOPS = '(?=\\s+(?:con|en|que|para|junto)\\b|[.;,]|$)';
// [regex, keeps-unlisted-names-as-family, names-a-parent]
const RELATIONS: [RegExp, boolean, boolean][] = [
  [new RegExp(`\\b[Hh]ermano de (${NAME})${STOPS}`, 'g'), true, true],
  [new RegExp(`\\b(?:de|por) los (?:creadores|chefs|fundadores|dueños|socios) de (${NAME})${STOPS}`, 'g'), true, true],
  [new RegExp(`\\b[Ee]quipo de (${NAME})${STOPS}`, 'g'), true, true],
  // "el chef de Máximo", "la chef de Cana" — only links venues that are in the guide
  [new RegExp(`\\bchef de (${NAME})${STOPS}`, 'g'), false, true],
  // "El grupo tiene otras sedes como Azul Condesa y Azulísimo"
  [/otras sedes como ([A-ZÁÉÍÓÚÑ][^.;]*?)(?=[.;]|$)/g, true, false],
];
const NAMED = /\b[Gg]rupo\s+([A-ZÁÉÍÓÚÑ][A-Za-zÀ-ÿ0-9'’-]*(?:\s+(?:de\s+|del\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÀ-ÿ0-9'’-]*)*)/g;

for (const p of CARTE_CDMX) {
  for (const text of [p.blurb, p.why, p.chef].filter(Boolean) as string[]) {
    // Named groups: "Grupo Castellano" → a group node; "grupo Pujol" → Pujol's group.
    for (const m of text.matchAll(NAMED)) {
      const label = m[1].trim();
      const v = resolveVenue(label);
      const said = text === p.chef ? `Chef credit: ${p.chef}` : sentenceAt(text, m.index ?? 0);
      if (v && v.id !== p.id) {
        link(p, v.id, said);
        parentRefs.push({ placeId: p.id, label: v.name, resolved: true });
      } else if (!v) {
        const node = 'G:' + vkey(label);
        namedOf[node] = 'Grupo ' + label;
        link(p, node, said);
      }
    }
    if (text === p.chef) continue;
    // Sister / parent statements.
    for (const [re, keepAlso, isParent] of RELATIONS) {
      for (const m of text.matchAll(re)) {
        for (const name of splitNames(m[1])) {
          const v = resolveVenue(name);
          const said = sentenceAt(text, m.index ?? 0);
          if (v && v.id !== p.id) {
            link(p, v.id, said);
            if (isParent) parentRefs.push({ placeId: p.id, label: vkey(name) === vkey(v.name) ? v.name : name, resolved: true });
          } else if (!v && keepAlso) {
            externals.push({ placeId: p.id, name });
            if (isParent) parentRefs.push({ placeId: p.id, label: name, resolved: false });
            linked.add(p.id);
            union(p.id, p.id);
            if (!evidence.some((e) => e.placeId === p.id && e.text === said)) evidence.push({ placeId: p.id, text: said });
          }
        }
      }
    }
  }
  // A chef credit flagged "(grupo)": the chef's other venues share the group.
  if (p.chef && /\(\s*grupo\b/i.test(p.chef)) {
    const c = chefForPlace(p);
    c?.placeIds.forEach((id) => id !== p.id && link(p, id, `Chef credit: ${p.chef}`));
  }
}

// Same official website → same operator.
{
  const byDomain: Record<string, Place[]> = {};
  CARTE_CDMX.forEach((p) => {
    const d = domainOf(p.website);
    if (d) (byDomain[d] = byDomain[d] || []).push(p);
  });
  Object.entries(byDomain).forEach(([d, ps]) => {
    if (ps.length < 2) return;
    ps.slice(1).forEach((p) => link(p, ps[0].id, `Shares its official website (${d}) with ${ps[0].name}.`));
  });
}

// ── Assemble groups from the linked components ──────────────────────────────
function brandPrefix(names: string[]): string {
  const keys = names.map(vkey);
  const first = names[0].split(/\s+/);
  let best = '';
  for (let k = 1; k <= Math.min(3, first.length); k++) {
    const cand = vkey(first.slice(0, k).join(' '));
    const last = cand.split(' ').pop() || '';
    if (cand.length < 3 || STOP.has(last)) continue;
    if (keys.every((x) => x.startsWith(cand))) best = first.slice(0, k).join(' ');
  }
  return best;
}

const groupMap: Record<string, Group> = {};
const placeToGroup: Record<string, string> = {};
{
  const comps: Record<string, string[]> = {};
  linked.forEach((id) => {
    if (!BY_ID[id]) return;
    const root = find(id);
    (comps[root] = comps[root] || []).push(id);
  });

  for (const [root, ids] of Object.entries(comps)) {
    const members = ids.map((id) => BY_ID[id]).sort((a, b) => (b.acclaim ?? 0) - (a.acclaim ?? 0));
    const memberSet = new Set(ids);
    const also = Array.from(
      new Map(
        externals.filter((e) => memberSet.has(e.placeId)).map((e) => [vkey(e.name), e.name] as [string, string]),
      ).values(),
    );
    // Only real groups: two+ venues in the guide, or one with named sisters.
    if (members.length < 2 && !also.length) continue;

    const named = Object.keys(namedOf).find((node) => find(node) === root);
    let name: string;
    let crest: string;
    if (named) {
      name = namedOf[named];
      crest = name;
    } else {
      const brand = brandPrefix([...members.map((m) => m.name), ...also]);
      const refs = parentRefs.filter((r) => memberSet.has(r.placeId));
      const tally: Record<string, { label: string; n: number; resolved: boolean }> = {};
      refs.forEach((r) => {
        const k = vkey(r.label);
        tally[k] = tally[k] || { label: r.label, n: 0, resolved: r.resolved };
        tally[k].n += 1;
      });
      const top = Object.values(tally).sort((a, b) => Number(b.resolved) - Number(a.resolved) || b.n - a.n)[0];
      crest = brand || top?.label || members[0].name;
      name = `${crest} family`;
    }

    const id = 'group-' + slugify(name);
    const best = members[0];
    const chefIds = Array.from(new Set(members.map((m) => chefForPlace(m)?.id).filter((x): x is string => !!x)));
    groupMap[id] = {
      id,
      name,
      crest,
      kind: named ? 'named' : 'family',
      placeIds: members.map((m) => m.id),
      also,
      evidence: evidence.filter((e) => memberSet.has(e.placeId)),
      chefIds,
      acclaim: members.reduce((m, p) => Math.max(m, p.acclaim ?? 0), 0),
      topAward: guideBadgeOf(best) || best.recognition || '',
      cuisines: Array.from(new Set(members.map((m) => m.cuisine).filter(Boolean))),
      hoods: Array.from(new Set(members.map((m) => m.hood).filter(Boolean))),
    };
    members.forEach((m) => (placeToGroup[m.id] = id));
  }
}

/** All groups — the biggest and most acclaimed first. */
export const GROUPS: Group[] = Object.values(groupMap).sort(
  (a, b) => b.placeIds.length - a.placeIds.length || b.acclaim - a.acclaim || a.name.localeCompare(b.name),
);

export function groupById(id: string | null | undefined): Group | undefined {
  return id ? groupMap[id] : undefined;
}

/** The group a venue belongs to, if the guide ties it to one. */
export function groupForPlace(place: Place | null | undefined): Group | undefined {
  return place ? groupMap[placeToGroup[place.id]] : undefined;
}

/** Groups a chef cooks within. */
export function groupsForChef(chefId: string): Group[] {
  return GROUPS.filter((g) => g.chefIds.includes(chefId));
}

/** A group's member venues as full Place records (most acclaimed first). */
export function placesOfGroup(group: Group): Place[] {
  return group.placeIds.map((id) => BY_ID[id]).filter((p): p is Place => !!p);
}
