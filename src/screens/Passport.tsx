/**
 * You — the Food Passport. The profile follows a real passport, page by page,
 * built from where the foodie actually ate (no post grid, no follower counts
 * for diners):
 *
 *  - Cover + data page: name, palate archetype, home city, issue date, the
 *    record (stamps · colonias · visas · average), the holder's signature (their
 *    manifesto), a holographic papel picado cut from their palate, and a
 *    machine-readable zone that encodes it all (with real ICAO check digits).
 *  - Contents: the booklet's pages —
 *    · Visas: guide collections (Michelin stars, 50 Best, Bib Gourmand, 2026
 *      openings) with the next entry to collect, and pending visits (want-to-try).
 *    · Sellos: the colonias crossed (a schematic of the guide's map) and one
 *      entry stamp per ranked table.
 *    · Biometría: the palate print — papel picado, radar, flavour DNA, what you
 *      chase, go-to order, palates like yours.
 *    · Observaciones: the menú degustación endorsed from your rankings, and the
 *      holder's note.
 *  - Settings fold away at the foot (language, account, critic access).
 *
 * Verified critics carry a PRESS passport (type D): a darker cover, beat and
 * readers on the data page, and the Critic's Desk for hosting events.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { fmt } from '../store/helpers';
import { C, col } from '../theme/tokens';
import { identity, isCritic, formatFollowers, CRITIC_BEATS } from '../data/profile';
import { computePalate, friendPalate, tasteMatch, PALATE_AXES, type Palate } from '../data/palate';
import { FRIENDS, byId, type Place } from '../store/data';
import { cityById } from '../data/cities';
import { CARTE_CDMX } from '../data/carte';
import { tastingMenu, territory, guideAlbum, guideTwin, mrzLines, hashOf, GRID_COLS, GRID_ROWS, type Course, type HoodTile, type AlbumSet } from '../data/youProfile';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { LangPicker } from '../components/LangPicker';
import { PalateRadar } from '../components/PalateRadar';
import { Monogram } from '../components/Monogram';
import { PapelPicado, MOTIF_GLYPH } from '../components/PapelPicado';
import { PlusIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

type Page = 'index' | 'visas' | 'stamps' | 'bio' | 'notes';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// ── small parts ───────────────────────────────────────────────────────────────

/** A bilingual passport field label. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Banner s={7.5} tk={0.14} c={C.inkMuted}>
      {children}
    </Banner>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Banner s={9.5} tk={0.18} c={C.inkMuted} style={{ marginBottom: 8 }}>
      {children}
    </Banner>
  );
}

function Chevron({ color = C.inkBlack, dir = 'right' }: { color?: string; dir?: 'right' | 'left' | 'down' | 'up' }) {
  const d = dir === 'right' ? 'M9 6l6 6-6 6' : dir === 'left' ? 'M15 6l-6 6 6 6' : dir === 'down' ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6';
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Guilloché — the interlaced security print behind a data page. */
function Guilloche({ width, height }: { width: number; height: number }) {
  const paths = useMemo(() => {
    const out: string[] = [];
    const bands = Math.ceil(height / 28);
    for (let i = 0; i < bands; i++) {
      let d = '';
      for (let x = 0; x <= width; x += 6) {
        const y = 18 + i * 28 + Math.sin(x / 26 + i * 0.7) * 9 + Math.sin(x / 61 + i) * 6;
        d += (x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(1) + ' ';
      }
      out.push(d);
    }
    return out;
  }, [width, height]);
  if (width <= 0) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.55 }}>
      <Svg width={width} height={height}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={C.sun200} strokeWidth={1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

/** The gold-foil cover emblem: a globe with fork and knife (press: a quill nib). */
function Emblem({ press }: { press?: boolean }) {
  const g = C.sun400;
  return (
    <Svg width={54} height={54} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={25} stroke={g} strokeWidth={2} fill="none" />
      <Circle cx={28} cy={28} r={19} stroke={g} strokeWidth={1} strokeDasharray="2 3" fill="none" />
      {press ? (
        <>
          <Path d="M19 37l4-16 12-6-4 16z" stroke={g} strokeWidth={2} strokeLinejoin="round" fill="none" />
          <Path d="M23 21l8 10" stroke={g} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <Ellipse cx={28} cy={28} rx={9} ry={19} stroke={g} strokeWidth={1} fill="none" />
          <Line x1={9} y1={28} x2={47} y2={28} stroke={g} strokeWidth={1} />
          <Path d="M21 16v10a3 3 0 0 0 6 0V16M24 16v24" stroke={g} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d="M34 40V16c3 2 4 6 4 10h-4" stroke={g} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </Svg>
  );
}

/** Header of an inside page: back to the data page, title, page numbers, document number. */
function PageHeader({ title, sub, no, onBack, top }: { title: string; sub: string; no: string; onBack: () => void; top: number }) {
  return (
    <View style={{ paddingTop: top + 10, paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: C.inkBlack, backgroundColor: C.paper0 }}>
      <Pressable onPress={onBack} accessibilityLabel="Back to passport" hitSlop={6} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper0 }}>
        <Chevron dir="left" color={C.ink400} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Display s={24} c={C.inkDeep} numberOfLines={1}>
          {title}
        </Display>
        <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }}>
          {sub}
        </Mono>
      </View>
      <Mono s={9.5} c={C.inkMuted}>
        Nº {no}
      </Mono>
    </View>
  );
}

function PageFoot({ n }: { n: string }) {
  return (
    <Mono s={10} c={C.inkMuted} style={{ textAlign: 'center', marginTop: 18 }}>
      — {n} —
    </Mono>
  );
}

function BecomeCriticCard({ onVerify }: { onVerify: (beat: string) => void }) {
  const [beat, setBeat] = useState(CRITIC_BEATS[0]);
  return (
    <View style={{ gap: 10 }}>
      <Serif s={13} c={C.inkMuted} style={{ lineHeight: 18 }}>
        Critics carry a press passport: a seal on their verdicts, and they can put curated events on the community calendar.
      </Serif>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {CRITIC_BEATS.map((b) => {
          const on = beat === b;
          return (
            <Pressable key={b} onPress={() => setBeat(b)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11, backgroundColor: on ? C.sun400 : C.paper0 }}>
              <Banner s={9.5} tk={0.06} c={C.inkDeep}>
                {b}
              </Banner>
            </Pressable>
          );
        })}
      </View>
      <StickerPressable offset="sm" radius={999} onPress={() => onVerify(beat)} style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 12 }}>
        <Banner s={11.5} tk={0.1} c={C.paper0}>
          Apply for a press passport
        </Banner>
      </StickerPressable>
      <Mono s={8.5} c={C.inkMuted} style={{ textAlign: 'center' }}>
        Pilot: instant for testers · real verification lands with the backend
      </Mono>
    </View>
  );
}

// ── Visas ─────────────────────────────────────────────────────────────────────

const VISA_STYLE: Record<string, { band: string; tint: string; ink: string; issuer: string; code: string }> = {
  stars: { band: C.ink400, tint: C.ink50, ink: C.ink500, issuer: 'GUÍA MICHELIN 2026', code: 'MX-ST' },
  '50best': { band: C.stampBlue, tint: C.blueFg, ink: C.stampBlue, issuer: "LATIN AMERICA'S 50 BEST", code: 'MX-50' },
  bib: { band: C.stampGreen, tint: C.greenFg, ink: C.stampGreen, issuer: 'GUÍA MICHELIN 2026', code: 'MX-BG' },
  open26: { band: C.sun700, tint: C.sun50, ink: C.sun700, issuer: 'GUÍA CDMX 2026', code: 'MX-AP' },
};
const VISA_SLOTS = 10;

function VisasPage({ sets, pending }: { sets: AlbumSet[]; pending: Place[] }) {
  const openPlace = useStore((s) => s.openPlace);
  return (
    <View style={{ gap: 16 }}>
      <Serif s={14} c={C.inkMuted} style={{ lineHeight: 20 }}>
        Each guide is a visa. Every table you rank from it stamps an entry; the next one to collect is printed at the foot.
      </Serif>
      {sets.map((s) => {
        const st = VISA_STYLE[s.key] || VISA_STYLE.stars;
        const shown = Math.min(VISA_SLOTS, s.all.length);
        const more = s.all.length - Math.max(shown, s.got.length);
        return (
          <StickerView key={s.key} offset="sm" style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: st.tint }}>
            <View accessibilityLabel={`${s.label} visa, ${s.got.length} of ${s.all.length}`} style={{ backgroundColor: st.band, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: C.inkBlack }}>
              <Banner s={10.5} tk={0.22} c={C.paper0}>
                VISA
              </Banner>
              <Banner s={8.5} tk={0.12} c={C.paper0} style={{ flex: 1 }} numberOfLines={1}>
                {st.issuer}
              </Banner>
              <Mono s={9} c={C.paper0}>
                {st.code}-{String(s.all.length).padStart(2, '0')}
              </Mono>
            </View>
            <View style={{ padding: 12, flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 70, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.inkSoft, borderStyle: 'dashed', paddingVertical: 6 }}>
                <Display s={24} c={st.ink}>
                  {s.got.length}
                </Display>
                <Mono s={9.5} c={C.inkMuted}>
                  of {s.all.length}
                </Mono>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
                <SerifDisplay s={18} c={C.inkDeep}>
                  {s.label}
                </SerifDisplay>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  {s.got.map((p) => (
                    <Pressable key={p.id} onPress={() => openPlace(p.id)} accessibilityLabel={`Stamp: ${p.name}`} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: st.band, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                      <Banner s={8} c={C.paper0}>
                        {p.name.replace(/^(el|la|los|las)\s+/i, '')[0]}
                      </Banner>
                    </Pressable>
                  ))}
                  {Array.from({ length: Math.max(0, shown - s.got.length) }).map((_, i) => (
                    <View key={i} style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.inkSoft, borderStyle: 'dashed' }} />
                  ))}
                  {more > 0 ? (
                    <Mono s={9} c={C.inkMuted}>
                      +{more}
                    </Mono>
                  ) : null}
                </View>
                {s.next ? (
                  <Pressable onPress={() => openPlace(s.next!.id)} accessibilityLabel={`Next entry: ${s.next.name}`} style={{ alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingHorizontal: 10, backgroundColor: C.paper0, maxWidth: '100%' }}>
                    <Mono s={9} c={C.inkMuted}>
                      next entry
                    </Mono>
                    <Banner s={9.5} tk={0.05} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {s.next.name} →
                    </Banner>
                  </Pressable>
                ) : (
                  <Mono s={9.5} c={st.ink}>
                    Collection complete
                  </Mono>
                )}
              </View>
            </View>
          </StickerView>
        );
      })}

      {pending.length ? (
        <View style={{ marginTop: 6 }}>
          <SectionLabel>SOLICITUDES EN TRÁMITE · PENDING VISITS</SectionLabel>
          <View style={{ gap: 8 }}>
            {pending.map((p) => (
              <Pressable key={p.id} onPress={() => openPlace(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderStyle: 'dashed' }}>
                <Monogram name={p.name} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Banner s={11} tk={0.05} c={C.inkDeep} numberOfLines={1}>
                    {p.name}
                  </Banner>
                  <Mono s={9} c={C.inkMuted} numberOfLines={1}>
                    {[p.hood, p.category || p.cuisine, p.price].filter(Boolean).join(' · ')}
                  </Mono>
                </View>
                <View style={{ transform: [{ rotate: '-8deg' }], borderWidth: 2, borderColor: C.stampBlue, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Banner s={8} tk={0.14} c={C.stampBlue}>
                    EN TRÁMITE
                  </Banner>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Sellos ────────────────────────────────────────────────────────────────────

const STAMP_INKS = [C.ink400, C.stampBlue, C.stampGreen, C.ink600, C.stampPink, C.ink500, C.sun700];

function EntryStamp({ p, i, colW }: { p: Place; i: number; colW: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const h = hashOf(p.id);
  const shape = i % 3; // circle · rectangle · oval
  const ink = STAMP_INKS[h % STAMP_INKS.length];
  const rot = `${((h >> 3) % 17) - 8}deg`;
  const w = shape === 0 ? Math.min(108, colW - 10) : Math.min(150, colW - 8);
  const ht = shape === 0 ? w : shape === 1 ? 92 : 96;
  return (
    <Pressable onPress={() => openPlace(p.id)} accessibilityLabel={`Entry stamp: ${p.name}${p.score != null ? `, ${fmt(p.score)}` : ''}`} style={{ width: colW, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, height: ht, borderRadius: shape === 0 ? w / 2 : shape === 2 ? ht / 2 : 4, borderWidth: 2.5, borderColor: ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, transform: [{ rotate: rot }], opacity: 0.92 }}>
        {shape === 1 ? <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: ink }} /> : null}
        <Banner s={6.5} tk={0.16} c={ink}>
          ADMITIDO · CRTQ
        </Banner>
        <Banner s={9.5} tk={0.03} c={ink} numberOfLines={2} style={{ textAlign: 'center', marginTop: 1 }}>
          {p.name}
        </Banner>
        {p.score != null ? (
          <Display s={17} c={ink}>
            {fmt(p.score)}
          </Display>
        ) : null}
        <Mono s={7.5} c={ink} numberOfLines={1}>
          {(p.hood || '').toUpperCase()}
        </Mono>
      </View>
    </Pressable>
  );
}

function StampsPage({ tiles, visited, elsewhere, ranked, width }: { tiles: HoodTile[]; visited: number; elsewhere: Place[]; ranked: Place[]; width: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const firstVisited = useMemo(() => tiles.slice().sort((a, b) => b.mine.length - a.mine.length)[0]?.key, [tiles]);
  const [sel, setSel] = useState<string | undefined>(firstVisited);
  const cur = tiles.find((t) => t.key === sel);
  const beenGuide = useMemo(() => new Set(ranked.map((r) => guideTwin(r, true)?.id).filter(Boolean) as string[]), [ranked]);
  const toTry = cur ? cur.guide.filter((g) => !beenGuide.has(g.id)).slice(0, 3) : [];
  const gap = 6;
  const tile = Math.max(26, Math.min(38, Math.floor((width - 24 - gap * (GRID_COLS - 1)) / GRID_COLS)));
  const mapW = GRID_COLS * tile + (GRID_COLS - 1) * gap;
  const colW = Math.floor((width - 14) / 2);
  const stamps = ranked.filter((r) => r.score != null && !r.provisional);

  return (
    <View style={{ gap: 18 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Display s={32} c={C.ink400}>
            {visited}
          </Display>
          <Serif s={15} c={C.inkDeep} style={{ marginBottom: 5 }}>
            of {tiles.length} colonias crossed
          </Serif>
        </View>
        <View style={{ marginTop: 10, padding: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', gap: 8 }}>
          {width > 0 ? (
            <View style={{ width: mapW, height: GRID_ROWS * tile + (GRID_ROWS - 1) * gap }}>
              {tiles.map((t) => {
                const on = t.mine.length > 0;
                const active = t.key === sel;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setSel(t.key)}
                    accessibilityLabel={`${t.name}${on ? `, ${t.mine.length} of yours` : ''}`}
                    style={{
                      position: 'absolute',
                      left: t.col * (tile + gap),
                      top: t.row * (tile + gap),
                      width: tile,
                      height: tile,
                      borderRadius: on ? tile / 2 : 6,
                      backgroundColor: on ? t.color : 'transparent',
                      borderWidth: active ? 3 : on ? 2 : 1.5,
                      borderColor: active ? C.sun500 : on ? C.inkBlack : C.inkSoft,
                      borderStyle: on || active ? 'solid' : 'dashed',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Banner s={tile > 34 ? 8.5 : 7.5} tk={0.03} c={on ? C.paper0 : C.inkMuted}>
                      {t.abbr}
                    </Banner>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Mono s={9} c={C.inkMuted}>
              N ↑ · west → east
            </Mono>
            <Mono s={9} c={C.inkMuted}>
              tap a colonia
            </Mono>
          </View>
        </View>
        {cur ? (
          <View style={{ marginTop: 10, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 12, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <SerifDisplay s={18} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
                {cur.name}
              </SerifDisplay>
              <Mono s={9} c={C.inkMuted}>
                {cur.mine.length ? `${cur.mine.length} yours · ` : ''}
                {cur.guide.length} in the guide
              </Mono>
            </View>
            {cur.mine.map((p) => (
              <Pressable key={p.id} onPress={() => openPlace(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 28 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
                <Banner s={10.5} tk={0.04} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                  {p.name}
                </Banner>
                {p.score != null ? (
                  <Mono s={9.5} c={C.inkMuted}>
                    {fmt(p.score)}
                  </Mono>
                ) : null}
              </Pressable>
            ))}
            {toTry.length ? (
              <>
                <Banner s={8} tk={0.16} c={C.inkMuted} style={{ marginTop: cur.mine.length ? 4 : 0 }}>
                  {cur.mine.length ? 'STILL TO TRY HERE' : 'START HERE'}
                </Banner>
                {toTry.map((g) => (
                  <Pressable key={g.id} onPress={() => openPlace(g.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 28 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink400 }} />
                    <Serif s={13} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                      {g.name}
                    </Serif>
                    <Mono s={9} c={C.ink400}>
                      →
                    </Mono>
                  </Pressable>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <View>
        <SectionLabel>ENTRADAS · ADMITTED</SectionLabel>
        {stamps.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 3, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack }}>
            {stamps.map((p, i) => (
              <EntryStamp key={p.id} p={p} i={i} colW={colW} />
            ))}
          </View>
        ) : (
          <Serif s={13.5} c={C.inkMuted}>
            No stamps yet — rank a place and it's stamped here.
          </Serif>
        )}
        {elsewhere.length ? (
          <Mono s={9} c={C.inkMuted} style={{ marginTop: 8 }}>
            Also admitted beyond the map: {elsewhere.map((p) => p.name).join(' · ')}
          </Mono>
        ) : null}
      </View>
    </View>
  );
}

// ── Biometría ─────────────────────────────────────────────────────────────────

function BioPage({ palate, avg, chase, seed, width }: { palate: Palate; avg: string; chase: string[]; seed: string; width: number }) {
  const openFoodie = useStore((s) => s.openFoodie);
  const openTasteCard = useStore((s) => s.openTasteCard);
  const t = useT();
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));
  const dnaTotal = palate.topCuisines.reduce((sum, c) => sum + c.count, 0) || 1;
  const closest = FRIENDS.map((f) => ({ f, m: tasteMatch(palate, friendPalate(f)) }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 3);
  const motifs = palate.axes
    .slice()
    .sort((a, b) => b.value - a.value)
    .filter((a) => a.value > 0.05)
    .slice(0, 3);

  return (
    <View style={{ gap: 20 }}>
      {/* the taste print */}
      <StickerView offset="sm" style={{ backgroundColor: C.ink700, borderWidth: 2, borderColor: C.inkBlack, padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Banner s={9} tk={0.18} c={C.sun300}>
            HUELLA DE SABOR · TASTE PRINT
          </Banner>
          <Pressable onPress={openTasteCard} hitSlop={8}>
            <Banner s={9} tk={0.1} c={C.ink100}>
              share ⤴
            </Banner>
          </Pressable>
        </View>
        <View style={{ marginTop: 8 }}>
          <PapelPicado palate={palate} seed={seed} width={Math.max(0, width - 28)} height={86} hole={C.ink700} />
        </View>
        <Mono s={9.5} c={C.ink100} style={{ marginTop: 6 }}>
          {motifs.length ? motifs.map((m) => `${MOTIF_GLYPH[m.key]} ${t('axis.' + m.key)}`).join('   ') : 'rank a few places to cut yours'}
        </Mono>
        <SerifItalic s={13.5} c={C.paper0} style={{ marginTop: 6, lineHeight: 19 }}>
          Colours from the cuisines you eat most, cut-outs from your strongest axes. It changes as you rank.
        </SerifItalic>
      </StickerView>

      {/* the radar */}
      <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <SerifItalic s={19} c={C.ink500} style={{ flexShrink: 1 }} numberOfLines={1}>
            {t('arch.' + palate.archId + '.t')}
          </SerifItalic>
          <Mono s={9.5} c={C.inkMuted}>
            {palate.sampleSize} ranked · avg {avg}
          </Mono>
        </View>
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <PalateRadar axes={palate.axes} labels={axisLabels} size={232} />
        </View>
      </View>

      {palate.topCuisines.length ? (
        <View>
          <SectionLabel>ADN DE SABOR · FLAVOR DNA</SectionLabel>
          <View style={{ flexDirection: 'row', height: 18, borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden' }}>
            {palate.topCuisines.map((c, i) => (
              <View key={c.name} style={{ width: `${(c.count / dnaTotal) * 100}%`, backgroundColor: c.color, borderRightWidth: i < palate.topCuisines.length - 1 ? 2 : 0, borderColor: C.inkBlack }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9 }}>
            {palate.topCuisines.map((c) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c.color, borderWidth: 1.5, borderColor: C.inkBlack }} />
                <Banner s={9.5} tk={0.04} c={C.inkDeep}>
                  {c.name}
                </Banner>
                <Mono s={9} c={C.inkMuted}>
                  {c.count}
                </Mono>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {chase.length || palate.goToDishes.length ? (
        <View>
          <SectionLabel>SEÑAS PARTICULARES · DISTINGUISHING MARKS</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {chase.map((name) => (
              <View key={name} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 5, paddingHorizontal: 11 }}>
                <Banner s={9.5} tk={0.08} c={C.inkDeep}>
                  {name}
                </Banner>
              </View>
            ))}
            {palate.goToDishes.map((d) => (
              <View key={d} style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, paddingVertical: 5, paddingHorizontal: 11 }}>
                <SerifItalic s={12.5} c={C.inkDeep}>
                  {d}
                </SerifItalic>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {closest.length ? (
        <View>
          <SectionLabel>COMPATIBLES · PALATES LIKE YOURS</SectionLabel>
          <View style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
            {closest.map(({ f, m }, i) => {
              const fp = friendPalate(f);
              return (
                <Pressable key={f.id} onPress={() => openFoodie(f.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: i < closest.length - 1 ? 1.5 : 0, borderBottomColor: C.paper200 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col(f.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                    <Banner s={10} c={C.paper0}>
                      {f.initials}
                    </Banner>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Banner s={11} tk={0.05} c={C.inkDeep} numberOfLines={1}>
                      {f.name}
                    </Banner>
                    <SerifItalic s={12} c={C.inkMuted} numberOfLines={1}>
                      {t('arch.' + fp.archId + '.t')}
                    </SerifItalic>
                  </View>
                  <Display s={15} c={m >= 80 ? C.stampGreen : m >= 60 ? C.sun700 : C.ink500}>
                    {m}%
                  </Display>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Observaciones ─────────────────────────────────────────────────────────────

function NotesPage({ courses, bio, canEdit, archBlurb }: { courses: Course[]; bio?: string; canEdit: boolean; archBlurb: string }) {
  const openPlace = useStore((s) => s.openPlace);
  const go = useStore((s) => s.go);
  const setBio = useStore((s) => s.setBio);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 16, paddingHorizontal: 14 }}>
      <Mono s={10} c={C.inkMuted} style={{ lineHeight: 16 }}>
        THE HOLDER OF THIS PASSPORT HAS BEEN ADMITTED TO THE FOLLOWING TABLES, WHICH TOGETHER CONSTITUTE THEIR
      </Mono>
      <Banner s={12.5} tk={0.3} c={C.ink400} style={{ marginTop: 10 }}>
        MENÚ DEGUSTACIÓN
      </Banner>
      <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
        {courses.length ? `${ROMAN[courses.length - 1]} tiempos · served from your rankings` : 'no courses yet'}
      </Mono>

      <View style={{ marginTop: 12 }}>
        {courses.length ? (
          courses.map((c, i) => (
            <Pressable key={c.key} onPress={() => openPlace(c.place.id)} accessibilityLabel={`${c.es}: ${c.place.name}`} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, minHeight: 44, borderTopWidth: 1.5, borderTopColor: C.paper200, borderStyle: 'dashed' }}>
              <Display s={13} c={C.ink400} style={{ width: 30, paddingTop: 2 }}>
                {ROMAN[i]}
              </Display>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Banner s={8} tk={0.18} c={C.inkMuted}>
                  {c.es.toUpperCase()}
                </Banner>
                <SerifDisplay s={17} c={C.inkDeep} numberOfLines={1}>
                  {c.place.name}
                </SerifDisplay>
                <SerifItalic s={12.5} c={C.inkMuted} numberOfLines={2}>
                  {c.dish || c.en}
                </SerifItalic>
              </View>
              <View style={{ alignItems: 'flex-end', paddingTop: 2 }}>
                {c.score != null ? (
                  <Display s={14} c={C.inkDeep}>
                    {fmt(c.score)}
                  </Display>
                ) : null}
                <Mono s={8.5} c={C.inkMuted}>
                  {c.place.hood}
                </Mono>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={{ alignItems: 'flex-start', gap: 10, paddingVertical: 6 }}>
            <SerifItalic s={14} c={C.inkMuted} style={{ lineHeight: 20 }}>
              Your menu writes itself as you rank — each table you log can become a course.
            </SerifItalic>
            <StickerPressable offset="sm" radius={999} onPress={() => go('log')} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 18 }}>
              <Banner s={10} tk={0.1} c={C.paper0}>
                Rank your first place
              </Banner>
            </StickerPressable>
          </View>
        )}
      </View>

      {/* the holder's note (their manifesto) */}
      <View style={{ marginTop: 6, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: C.inkBlack }}>
        <FieldLabel>NOTA DEL TITULAR / HOLDER'S NOTE</FieldLabel>
        {editing ? (
          <View style={{ marginTop: 6 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('you.manifestoPrompt')}
              placeholderTextColor={C.inkSoft}
              multiline
              autoFocus
              maxLength={280}
              style={{ minHeight: 70, textAlignVertical: 'top', fontFamily: 'Fraunces_400Regular', fontSize: 14.5, lineHeight: 21, color: C.inkBlack, borderWidth: 1.5, borderColor: C.paper300, padding: 8 }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => {
                  setBio(draft);
                  setEditing(false);
                }}
                style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.stampGreen, paddingVertical: 7, paddingHorizontal: 16 }}
              >
                <Banner s={10} tk={0.1} c={C.paper0}>
                  {t('common.save')}
                </Banner>
              </StickerPressable>
              <Pressable onPress={() => setEditing(false)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 16, justifyContent: 'center' }}>
                <Banner s={10} tk={0.1} c={C.inkMuted}>
                  {t('common.cancel')}
                </Banner>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ paddingRight: 92 }}>
            <SerifItalic s={15} c={bio ? C.inkDeep : C.inkMuted} style={{ marginTop: 4, lineHeight: 21 }}>
              “{bio || archBlurb}”
            </SerifItalic>
            {canEdit ? (
              <Pressable
                onPress={() => {
                  setDraft(bio || '');
                  setEditing(true);
                }}
                accessibilityLabel={bio ? 'Edit your note' : 'Write your note'}
                style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}
              >
                <Mono s={10} c={C.ink400}>
                  {bio ? 'Edit note' : 'Write your note →'}
                </Mono>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* the validating seal */}
      {!editing ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 14, bottom: 16, width: 84, height: 84, borderRadius: 42, borderWidth: 2.5, borderColor: C.ink400, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }], opacity: 0.85 }}>
          <View style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 39, borderWidth: 1, borderColor: C.ink400 }} />
          <Banner s={6.5} tk={0.16} c={C.ink400}>
            CRTQ · CDMX
          </Banner>
          <Display s={13} c={C.ink400}>
            VÁLIDO
          </Display>
        </View>
      ) : null}
    </StickerView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function Passport() {
  const insets = useSafeAreaInsets();
  const ranked = useStore((s) => s.ranked);
  const profile = useStore((s) => s.profile);
  const signOut = useStore((s) => s.signOut);
  const becomeCritic = useStore((s) => s.becomeCritic);
  const stepDownCritic = useStore((s) => s.stepDownCritic);
  const openCreate = useStore((s) => s.openCreate);
  const go = useStore((s) => s.go);
  const createdTables = useStore((s) => s.createdTables);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const wantIds = useStore((s) => s.wantIds);
  const nearby = useStore((s) => s.nearby);
  const openTasteCard = useStore((s) => s.openTasteCard);
  const t = useT();
  const [page, setPage] = useState<Page>('index');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cardW, setCardW] = useState(0);
  const [cardH, setCardH] = useState(0);
  const [pageW, setPageW] = useState(0);

  const me = identity(profile);
  const critic = isCritic(profile);
  const homeCity = cityById(me.cityId);
  const scores = ranked.map((r) => r.score).filter((n): n is number => n != null);
  const avg = scores.length ? fmt(scores.reduce((a, b) => a + b, 0) / scores.length) : '0.0';
  const eventsHosted = createdTables.filter((tb: any) => tb.critic).length;
  const no = String(me.passportNo).padStart(6, '0');

  const palate = useMemo(() => computePalate(ranked, tastes, userReviews), [ranked, tastes, userReviews]);
  const chase = tastes.length ? tastes : palate.topCuisines.map((c) => c.name);
  const archTitle = t('arch.' + palate.archId + '.t');
  const archBlurb = t('arch.' + palate.archId + '.b');
  const courses = useMemo(() => tastingMenu(ranked, userReviews), [ranked, userReviews]);
  const terr = useMemo(() => territory(ranked), [ranked]);
  const album = useMemo(() => guideAlbum(ranked), [ranked]);
  const visas = useMemo(() => new Set(album.flatMap((s) => s.got.map((p) => p.id))).size, [album]);
  const visaTotal = album.reduce((n, s) => n + s.all.length, 0);
  const pending = useMemo(() => {
    const find = (id: string) => nearby.find((p) => p.id === id) || byId[id] || CARTE_CDMX.find((p) => p.id === id);
    return wantIds.map(find).filter(Boolean).slice(0, 5) as Place[];
  }, [wantIds, nearby]);
  const [mrz1, mrz2] = mrzLines({ type: critic ? 'D' : 'P', name: me.name, passportNo: me.passportNo, country: homeCity.country, archetype: critic ? me.beat || 'PRESS' : archTitle, stamps: ranked.length, colonias: terr.visited, visas, avg });

  const parts = me.name.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '—';
  const record = critic
    ? [
        { v: String(ranked.length), l: 'VEREDICTOS' },
        { v: String(eventsHosted), l: 'EVENTOS' },
        { v: formatFollowers(me.followers || 0), l: 'LECTORES' },
        { v: avg, l: 'PROMEDIO' },
      ]
    : [
        { v: String(ranked.length), l: 'SELLOS' },
        { v: String(terr.visited), l: 'COLONIAS' },
        { v: String(visas), l: 'VISAS' },
        { v: avg, l: 'PROMEDIO' },
      ];
  const contents: { key: Page; num: string; title: string; sub: string; count: string; chip: string }[] = [
    { key: 'visas', num: '02', title: 'VISAS', sub: 'Guide collections · pending visits', count: `${visas} / ${visaTotal}`, chip: C.ink50 },
    { key: 'stamps', num: '06', title: 'SELLOS', sub: 'Entry stamps · colonias crossed', count: String(ranked.length), chip: C.sun100 },
    { key: 'bio', num: '10', title: 'BIOMETRÍA', sub: 'Your palate print', count: '6 axes', chip: C.blueFg },
    { key: 'notes', num: '11', title: 'OBSERVACIONES', sub: 'Your menú degustación', count: courses.length ? ROMAN[courses.length - 1] : '—', chip: C.greenFg },
  ];
  const PAGE_META: Record<Exclude<Page, 'index'>, { title: string; sub: string; foot: string }> = {
    visas: { title: 'VISAS', sub: 'Guide collections · pp. 02–05', foot: '02' },
    stamps: { title: 'SELLOS', sub: 'Entry stamps · pp. 06–09', foot: '06' },
    bio: { title: 'BIOMETRÍA', sub: 'Palate print · p. 10', foot: '10' },
    notes: { title: 'OBSERVACIONES', sub: 'Endorsements · p. 11', foot: '11' },
  };

  const hostEvent = () => {
    go('table');
    openCreate('event');
  };

  // ── an inside page ──
  if (page !== 'index') {
    const meta = PAGE_META[page];
    return (
      <ScreenIn key={page}>
        <PageHeader title={meta.title} sub={meta.sub} no={no} onBack={() => setPage('index')} top={insets.top} />
        <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 16, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
          <View onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
            {page === 'visas' ? (
              <VisasPage sets={album} pending={pending} />
            ) : page === 'stamps' ? (
              <StampsPage tiles={terr.tiles} visited={terr.visited} elsewhere={terr.elsewhere} ranked={ranked} width={pageW} />
            ) : page === 'bio' ? (
              <BioPage palate={palate} avg={avg} chase={chase} seed={me.handle || me.name} width={pageW} />
            ) : (
              <NotesPage courses={courses} bio={me.bio} canEdit={!!profile} archBlurb={archBlurb} />
            )}
          </View>
          <PageFoot n={meta.foot} />
        </ScrollView>
      </ScreenIn>
    );
  }

  // ── the data page + contents ──
  return (
    <ScreenIn>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* the cover, folded back */}
        <View style={{ backgroundColor: critic ? C.inkDeep : C.ink700, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 70, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Emblem press={critic} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Banner s={11} tk={0.14} c={C.sun400} numberOfLines={1}>
              {critic ? 'PASAPORTE DE PRENSA' : 'PASAPORTE GASTRONÓMICO'}
            </Banner>
            <Banner s={9} tk={0.2} c={critic ? C.sun300 : C.ink100}>
              {critic ? 'PRESS PASSPORT · CRTQ' : 'FOOD PASSPORT · CRTQ'}
            </Banner>
          </View>
          <Pressable onPress={openTasteCard} accessibilityLabel="Share your passport" hitSlop={4} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.sun400, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" stroke={C.sun400} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        {/* the data page */}
        <View style={{ marginTop: -50, marginHorizontal: 14 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
            <View
              accessibilityLabel="Passport data page"
              onLayout={(e) => {
                setCardW(e.nativeEvent.layout.width);
                setCardH(e.nativeEvent.layout.height);
              }}
            >
              <Guilloche width={cardW} height={cardH} />
              <View style={{ paddingTop: 11, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Mono s={9} c={C.inkMuted}>
                  TIPO / TYPE <Mono s={9} c={critic ? C.ink500 : C.inkDeep}>{critic ? 'D · PRENSA' : 'P'}</Mono>
                </Mono>
                {/* holographic papel picado: the holder's palate print */}
                <View pointerEvents="none" style={{ opacity: 0.45, marginTop: -4 }}>
                  <PapelPicado palate={palate} seed={me.handle || me.name} width={104} height={24} flags={5} hole={C.paper0} />
                </View>
                <Mono s={9} c={C.inkMuted}>
                  Nº <Mono s={9} c={C.inkDeep}>{no}</Mono>
                </Mono>
              </View>

              <View style={{ paddingTop: 14, paddingHorizontal: 14, flexDirection: 'row', gap: 14 }}>
                <View>
                  <View style={{ width: 96, height: 122, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: col(me.color), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {me.avatarUrl ? (
                      <Image source={{ uri: me.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Display s={34} c={C.paper0}>
                        {me.initials}
                      </Display>
                    )}
                    {critic ? <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 2, borderColor: C.sun400 }} /> : null}
                  </View>
                  {critic ? (
                    <View style={{ position: 'absolute', left: 8, right: 8, bottom: -8, alignItems: 'center', backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, paddingVertical: 2, transform: [{ rotate: '-6deg' }] }}>
                      <Banner s={8.5} tk={0.2} c={C.paper0}>
                        PRESS
                      </Banner>
                    </View>
                  ) : (
                    <View pointerEvents="none" style={{ position: 'absolute', right: -6, bottom: -14, width: 54, height: 54, borderRadius: 28, borderWidth: 2, borderColor: C.ink400, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-14deg' }], backgroundColor: 'rgba(255,253,245,0.82)' }}>
                      <Banner s={7} tk={0.12} c={C.ink400}>
                        {homeCity.name.toUpperCase().slice(0, 6)}
                      </Banner>
                      <Display s={12} c={C.ink400}>
                        {me.joined.slice(-4)}
                      </Display>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
                  {critic ? (
                    <>
                      <View>
                        <FieldLabel>TITULAR / HOLDER</FieldLabel>
                        <Mono s={14} c={C.inkDeep} numberOfLines={1}>
                          {`${surname}, ${given}`.toUpperCase()}
                        </Mono>
                      </View>
                      <View>
                        <FieldLabel>FUENTE / BEAT</FieldLabel>
                        <SerifItalic s={18} c={C.ink500} numberOfLines={1}>
                          {me.beat || 'CDMX dining'}
                        </SerifItalic>
                      </View>
                      <View>
                        <FieldLabel>ACREDITACIÓN / VERIFIED</FieldLabel>
                        <Mono s={11.5} c={C.stampGreen}>
                          ✓ VERIFIED CRITIC
                        </Mono>
                      </View>
                    </>
                  ) : (
                    <>
                      <View>
                        <FieldLabel>APELLIDOS / SURNAME</FieldLabel>
                        <Mono s={14} c={C.inkDeep} numberOfLines={1}>
                          {surname.toUpperCase()}
                        </Mono>
                      </View>
                      <View>
                        <FieldLabel>NOMBRES / GIVEN NAMES</FieldLabel>
                        <Mono s={14} c={C.inkDeep} numberOfLines={1}>
                          {given.toUpperCase()}
                        </Mono>
                      </View>
                      <View>
                        <FieldLabel>PALADAR / PALATE</FieldLabel>
                        <SerifItalic s={18} c={C.ink500} numberOfLines={1}>
                          {archTitle}
                        </SerifItalic>
                      </View>
                    </>
                  )}
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View>
                      <FieldLabel>CIUDAD / HOME</FieldLabel>
                      <Mono s={11} c={C.inkDeep}>
                        {homeCity.name.toUpperCase()}
                      </Mono>
                    </View>
                    <View>
                      <FieldLabel>EXPEDICIÓN / ISSUED</FieldLabel>
                      <Mono s={11} c={C.inkDeep}>
                        {me.joined}
                      </Mono>
                    </View>
                  </View>
                </View>
              </View>

              {/* the holder's record */}
              <View style={{ marginTop: 16, marginHorizontal: 14, flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
                {record.map((r, i) => (
                  <View key={r.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRightWidth: i < record.length - 1 ? 2 : 0, borderColor: C.inkBlack }}>
                    <Display s={20} c={C.ink400}>
                      {r.v}
                    </Display>
                    <Banner s={7} tk={0.12} c={C.inkMuted}>
                      {r.l}
                    </Banner>
                  </View>
                ))}
              </View>

              {/* signature: the holder's manifesto */}
              <Pressable onPress={() => setPage('notes')} accessibilityLabel={me.bio ? 'Holder’s signature' : 'Sign your passport'} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}>
                <FieldLabel>FIRMA DEL TITULAR / HOLDER'S SIGNATURE</FieldLabel>
                <View style={{ borderBottomWidth: 1.5, borderBottomColor: C.paper300, paddingBottom: 5, marginTop: 3 }}>
                  <SerifItalic s={16} c={me.bio ? C.inkDeep : C.inkMuted} numberOfLines={2}>
                    {me.bio ? `“${me.bio}”` : profile ? 'Sign your passport — write your note →' : `“${archBlurb}”`}
                  </SerifItalic>
                </View>
              </Pressable>

              {/* machine-readable zone */}
              <View accessibilityLabel={`Machine-readable zone: ${ranked.length} stamps, ${terr.visited} colonias, ${visas} visas`} style={{ backgroundColor: C.paper100, borderTopWidth: 2, borderTopColor: C.paper300, borderStyle: 'dashed', paddingVertical: 9, paddingHorizontal: 10 }}>
                <Mono s={10.6} c={C.inkBlack} style={{ letterSpacing: 0.55, lineHeight: 16 }} numberOfLines={1}>
                  {mrz1}
                </Mono>
                <Mono s={10.6} c={C.inkBlack} style={{ letterSpacing: 0.55, lineHeight: 16 }} numberOfLines={1}>
                  {mrz2}
                </Mono>
              </View>
            </View>
          </StickerView>
        </View>

        {/* the critic's desk — press passports only */}
        {critic ? (
          <View style={{ marginTop: 22, marginHorizontal: 14 }}>
            <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 14, gap: 10 }}>
              <Banner s={9.5} tk={0.18} c={C.inkMuted}>
                ESCRITORIO DEL CRÍTICO · CRITIC'S DESK
              </Banner>
              <Serif s={13.5} c={C.inkDeep} style={{ lineHeight: 19 }}>
                Host curated events at any restaurant. They publish to the community calendar under your press seal.
              </Serif>
              <StickerPressable offset="sm" radius={999} onPress={hostEvent} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.inkDeep, minHeight: 48 }}>
                <PlusIcon size={14} color={C.sun400} sw={2.6} />
                <Banner s={11.5} tk={0.12} c={C.paper0}>
                  Host an event
                </Banner>
              </StickerPressable>
              <Mono s={9} c={C.inkMuted}>
                {eventsHosted === 0 ? 'No events yet — host your first.' : `${eventsHosted} event${eventsHosted > 1 ? 's' : ''} hosted`}
              </Mono>
            </StickerView>
          </View>
        ) : null}

        {/* contents */}
        <View style={{ marginTop: 24, marginHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SectionLabel>ÍNDICE · CONTENTS</SectionLabel>
            <Mono s={9} c={C.inkMuted}>
              32 pp.
            </Mono>
          </View>
          <View style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
            {contents.map((p, i) => (
              <Pressable key={p.key} onPress={() => setPage(p.key)} accessibilityRole="button" accessibilityLabel={`${p.title} page`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: i < contents.length - 1 ? 1.5 : 0, borderBottomColor: C.paper200 }}>
                <Display s={17} c={C.ink400} style={{ width: 34 }}>
                  {p.num}
                </Display>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Banner s={11.5} tk={0.1} c={C.inkDeep}>
                    {p.title}
                  </Banner>
                  <Serif s={12.5} c={C.inkMuted} numberOfLines={1}>
                    {p.sub}
                  </Serif>
                </View>
                <View style={{ backgroundColor: p.chip, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Mono s={10} c={C.inkDeep}>
                    {p.count}
                  </Mono>
                </View>
                <Chevron />
              </Pressable>
            ))}
          </View>
        </View>

        {/* settings, folded away */}
        <View style={{ marginTop: 16, marginHorizontal: 14 }}>
          <Pressable onPress={() => setSettingsOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: settingsOpen }} accessibilityLabel="Passport settings" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 2, borderColor: C.paper300, borderStyle: 'dashed' }}>
            <Banner s={9.5} tk={0.14} c={C.inkMuted} style={{ flex: 1 }}>
              AJUSTES · LANGUAGE, ACCOUNT{profile && !critic ? ', PRESS ACCESS' : ''}
            </Banner>
            <Chevron dir={settingsOpen ? 'up' : 'down'} color={C.inkMuted} />
          </Pressable>
          {settingsOpen ? (
            <View style={{ marginTop: 12, gap: 20 }}>
              {profile && !critic ? (
                <View>
                  <SectionLabel>{t('you.criticAccess').toUpperCase()}</SectionLabel>
                  <BecomeCriticCard onVerify={becomeCritic} />
                </View>
              ) : null}
              <View>
                <SectionLabel>{t('you.language').toUpperCase()}</SectionLabel>
                <LangPicker showLabels size={44} />
              </View>
              <View>
                <SectionLabel>{t('you.account').toUpperCase()}</SectionLabel>
                <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Banner s={11} tk={0.06} c={C.inkDeep}>
                      {me.handle}
                    </Banner>
                    <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
                      {profile && me.email ? `${t('you.googleAccount')} · ${me.email}` : critic ? 'Verified Critic · this device' : profile ? 'Local account · this device' : 'Guest · demo identity'}
                    </Mono>
                  </View>
                  {critic ? (
                    <StickerPressable offset="sm" radius={999} onPress={stepDownCritic} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13, marginRight: 8 }}>
                      <Banner s={9.5} tk={0.1} c={C.inkMuted}>
                        Step down
                      </Banner>
                    </StickerPressable>
                  ) : null}
                  <StickerPressable offset="sm" radius={999} onPress={signOut} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13 }}>
                    <Banner s={9.5} tk={0.1} c={C.ink400}>
                      {profile ? t('you.signout') : t('you.create')}
                    </Banner>
                  </StickerPressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
