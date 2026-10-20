/**
 * You — the Food Passport: one passport booklet, page by page, built from where
 * the foodie actually ate (no post grid, no follower counts for diners).
 *
 * Every page shares the same stock — stitched binding, guilloché print, emblem
 * watermark, perforated document number, running header, page number — and you
 * swipe through them (or use the page control) like turning pages:
 *
 *  - Cover: leather and gold foil, the e-passport chip mark.
 *  - p.1 Data page: surname / given names, palate archetype, home city, issue
 *    date, the record (sellos · colonias · visas · promedio), the holder's
 *    signature (their manifesto), a holographic papel picado, and the
 *    machine-readable zone (ICAO 9303 layout with real check digits).
 *  - p.2 Visas: guide collections (Michelin stars, 50 Best, Bib Gourmand, 2026
 *    openings), the next entry to collect, and pending visits (want-to-try).
 *  - p.3 Sellos: the colonias crossed (a schematic of the guide's map) and one
 *    rubber entry stamp per ranked table.
 *  - p.4 Biometría: the palate print — papel picado, radar, flavour DNA,
 *    distinguishing marks, palates like yours.
 *  - p.5 Observaciones: the menú degustación endorsed from your rankings and
 *    the holder's note.
 *  - p.6 Ajustes (inside back cover): press access, language, account.
 *
 * Verified critics carry a PRESS passport (type D): a darker cover, beat and
 * readers on the data page, and the Critic's Desk for hosting events.
 */
import { TrialPanel } from '../components/TrialPanel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Animated, PanResponder, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { favoritesFromRanked, FAV_CATS } from '../data/favorites';
import { VenueCover } from '../components/Cover';
import { TopFourGrid } from '../components/TopFour';
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
import { Grain } from '../components/Grain';
import { BRAND } from '../assets';
import { ScreenIn } from '../components/Anim';

type Page = 'index' | 'visas' | 'stamps' | 'bio' | 'notes';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// ── small parts ───────────────────────────────────────────────────────────────

/** A bilingual passport field label. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
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

export function Chevron({ color = C.inkBlack, dir = 'right' }: { color?: string; dir?: 'right' | 'left' | 'down' | 'up' }) {
  const d = dir === 'right' ? 'M9 6l6 6-6 6' : dir === 'left' ? 'M15 6l-6 6 6 6' : dir === 'down' ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6';
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Guilloché — the interlaced security print behind a data page. */
function Guilloche({ width, height, color = C.sun200, opacity = 0.55 }: { width: number; height: number; color?: string; opacity?: number }) {
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
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, opacity }}>
      <Svg width={width} height={height}>
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={color} strokeWidth={1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

/** The gold-foil cover emblem: a globe with fork and knife (press: a quill nib). */
function Emblem({ press, size = 54, color = C.sun400 }: { press?: boolean; size?: number; color?: string }) {
  const g = color;
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
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

export function VisasPage({ sets, pending, third }: { sets: AlbumSet[]; pending: Place[]; third?: boolean }) {
  const openPlace = useStore((s) => s.openPlace);
  return (
    <View style={{ gap: 16 }}>
      <Serif s={13} c={C.inkMuted} style={{ lineHeight: 18 }}>
        {third ? 'Each guide is a visa: every table they’ve covered from it stamps an entry.' : 'Each guide is a visa: every table you rank from it stamps an entry.'}
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
                    <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ flexShrink: 0 }}>
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

export function StampsPage({ tiles, visited, elsewhere, ranked, width, third }: { tiles: HoodTile[]; visited: number; elsewhere: Place[]; ranked: Place[]; width: number; third?: boolean }) {
  const openPlace = useStore((s) => s.openPlace);
  const firstVisited = useMemo(() => tiles.slice().sort((a, b) => b.mine.length - a.mine.length)[0]?.key, [tiles]);
  const [sel, setSel] = useState<string | undefined>(firstVisited);
  const cur = tiles.find((t) => t.key === sel);
  const beenGuide = useMemo(() => new Set(ranked.map((r) => guideTwin(r, true)?.id).filter(Boolean) as string[]), [ranked]);
  const toTry = cur ? cur.guide.filter((g) => !beenGuide.has(g.id)).slice(0, 3) : [];
  const gap = 6;
  const tile = Math.max(26, Math.min(38, Math.floor((width - 24 - gap * (GRID_COLS - 1)) / GRID_COLS)));
  const mapW = GRID_COLS * tile + (GRID_COLS - 1) * gap;
  const colW = Math.floor(width / 2);
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
                    accessibilityLabel={`${t.name}${on ? `, ${t.mine.length} of ${third ? 'theirs' : 'yours'}` : ''}`}
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
                {cur.mine.length ? `${cur.mine.length} ${third ? 'theirs' : 'yours'} · ` : ''}
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
                  {third ? 'ALSO IN THE GUIDE HERE' : cur.mine.length ? 'STILL TO TRY HERE' : 'START HERE'}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
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

export function BioPage({ palate, avg, chase, seed, width, third }: { palate: Palate; avg: string; chase: string[]; seed: string; width: number; third?: boolean }) {
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
          {third ? null : (
            <Pressable onPress={openTasteCard} hitSlop={8}>
              <Banner s={9} tk={0.1} c={C.ink100}>
                share ⤴
              </Banner>
            </Pressable>
          )}
        </View>
        <View style={{ marginTop: 8 }}>
          <PapelPicado palate={palate} seed={seed} width={Math.max(0, width - 28)} height={86} hole={C.ink700} />
        </View>
        <Mono s={9.5} c={C.ink100} style={{ marginTop: 6 }}>
          {motifs.length ? motifs.map((m) => `${MOTIF_GLYPH[m.key]} ${t('axis.' + m.key)}`).join('   ') : third ? '—' : 'rank a few places to cut yours'}
        </Mono>
        <SerifItalic s={13.5} c={C.paper0} style={{ marginTop: 6, lineHeight: 19 }}>
          {third ? 'Colours from the cuisines they cover most, cut-outs from their strongest axes.' : 'Colours from the cuisines you eat most, cut-outs from your strongest axes. It changes as you rank.'}
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
          <SectionLabel>{third ? 'COMPATIBLES · PALATES LIKE THEIRS' : 'COMPATIBLES · PALATES LIKE YOURS'}</SectionLabel>
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
    <View style={{ paddingBottom: 8 }}>
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
    </View>
  );
}

/** p.2 — Favoritos: your favourite in each category (your Top 4 leads the data page). */
function FavsPage({ ranked }: { ranked: Place[] }) {
  const openPlace = useStore((s) => s.openPlace);
  const favs = favoritesFromRanked(ranked);
  const cats = FAV_CATS.filter((c) => favs[c.id]);
  return (
    <View accessibilityLabel="Passport favourites page">
      <SerifItalic s={12.5} c={C.inkMuted} style={{ lineHeight: 17, marginBottom: 10 }}>
        Your top-ranked place in each category. Each one makes you one of that restaurant’s biggest fans.
      </SerifItalic>
      {cats.length ? (
        cats.map((c) => {
          const p = favs[c.id]!;
          return (
            <Pressable key={c.id} onPress={() => openPlace(p.id)} accessibilityLabel={`Your favourite ${c.label}: ${p.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1.5, borderColor: 'rgba(42,26,6,0.14)' }}>
              <VenueCover place={p} style={{ width: 44, height: 44, borderWidth: 2, borderColor: C.inkBlack }} crestSize={20} credit={false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Mono s={8} c={C.ink400} numberOfLines={1}>
                  {c.glyph} {c.es.toUpperCase()} · {c.label}
                </Mono>
                <Serif s={14} c={C.inkDeep} numberOfLines={1}>
                  {p.name}
                </Serif>
              </View>
            </Pressable>
          );
        })
      ) : (
        <Mono s={9} c={C.inkMuted} style={{ lineHeight: 14 }}>
          Rank places and your favourite in each category appears here — your top-ranked tacos, seafood, fine dining…
        </Mono>
      )}
    </View>
  );
}

// ── The booklet ───────────────────────────────────────────────────────────────

type PageKey = 'cover' | 'data' | 'favs' | 'visas' | 'stamps' | 'bio' | 'notes' | 'settings';
const PAGES: { key: PageKey; name: string; title: string; sub: string; no: string; wash: string }[] = [
  { key: 'cover', name: 'Cover', title: '', sub: '', no: '', wash: '' },
  { key: 'data', name: 'Data page', title: '', sub: '', no: '1', wash: C.sun200 },
  { key: 'favs', name: 'Favoritos', title: 'FAVORITOS', sub: 'Your favourite in each category', no: '2', wash: C.ink100 },
  { key: 'visas', name: 'Visas', title: 'VISAS', sub: 'Guide collections · pending visits', no: '3', wash: C.sun200 },
  { key: 'stamps', name: 'Sellos', title: 'SELLOS', sub: 'Entry stamps · colonias crossed', no: '4', wash: C.ink100 },
  { key: 'bio', name: 'Biometría', title: 'BIOMETRÍA', sub: 'Palate print', no: '5', wash: C.sun200 },
  { key: 'notes', name: 'Observaciones', title: 'OBSERVACIONES', sub: 'Endorsements', no: '6', wash: C.ink100 },
  { key: 'settings', name: 'Ajustes', title: 'AJUSTES', sub: 'Settings · inside back cover', no: '7', wash: C.paper200 },
];
const NOTES_PAGE = PAGES.findIndex((p) => p.key === 'notes');

/** Survives leaving the tab (e.g. opening a restaurant from a page) for the session. */
let lastPage = 0;

/**
 * The page edge every booklet page sits in. The booklet lies on the render's
 * table: these insets leave room for the page block, the back board and the
 * soft cast shadow drawn by <BookletBase>.
 */
const PAGE_PAD = { paddingLeft: 16, paddingRight: 24, paddingTop: 10, paddingBottom: 18 } as const;

/**
 * Light on the page, as in the 3D render (key light from the top-left): a gutter
 * shadow down the spine and a soft sheen falling off toward the outer corner.
 */
function PageLight({ dark }: { dark?: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={['rgba(255,253,245,0.16)', 'rgba(255,253,245,0)', 'rgba(27,16,4,0.08)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={[dark ? 'rgba(27,16,4,0.45)' : 'rgba(27,16,4,0.26)', 'rgba(27,16,4,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 42 }}
      />
    </View>
  );
}

/**
 * What the pages lie on, drawn once beneath the pager: the soft cast shadow on
 * the table, the back board peeking out (sun-yellow; vermillion for the press),
 * and the page block's edges.
 */
export function BookletBase({ w, h, press }: { w: number; h: number; press: boolean }) {
  const x = PAGE_PAD.paddingLeft, y = PAGE_PAD.paddingTop;
  const pw = w - PAGE_PAD.paddingLeft - PAGE_PAD.paddingRight;
  const ph = h - PAGE_PAD.paddingTop - PAGE_PAD.paddingBottom;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: pw, height: ph }}>
      {/* soft shadow, layered */}
      {[
        { d: 16, o: 0.08, r: 14 },
        { d: 11, o: 0.1, r: 10 },
        { d: 7, o: 0.14, r: 6 },
      ].map((sh) => (
        <View key={sh.d} style={{ position: 'absolute', left: sh.d * 0.4, top: sh.d * 0.7, right: -sh.d, bottom: -sh.d, borderRadius: sh.r, backgroundColor: C.inkDeep, opacity: sh.o }} />
      ))}
      {/* the back board */}
      <View style={{ position: 'absolute', left: -2, top: 2, right: -7, bottom: -8, backgroundColor: press ? C.ink400 : C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 3 }} />
      {/* the page block's edges */}
      {[4, 3, 2, 1].map((k) => (
        <View key={k} style={{ position: 'absolute', left: 0, top: k * 0.6, right: -k * 1.2, bottom: -k * 1.2, backgroundColor: k % 2 ? C.paper100 : C.paper0, borderWidth: 1, borderColor: C.paper300 }} />
      ))}
    </View>
  );
}

/**
 * A page that turns in 3D. The pages lie stacked on the booklet (earliest on
 * top); `pos` is the open page as a float (1.4 = turning from p.1 to p.2). The
 * page being left lifts around the spine (perspective rotateY), shading as it
 * turns, revealing the next page beneath it.
 */
export function TurnPage({ i, w, h, pos, active, children }: { i: number; w: number; h: number; pos: Animated.Value; active: boolean; children: React.ReactNode }) {
  const pivot = w / 2 - PAGE_PAD.paddingLeft; // spine = the page's left edge
  const rotateY = pos.interpolate({ inputRange: [i, i + 1], outputRange: ['0deg', '-88deg'], extrapolate: 'clamp' });
  const shade = pos.interpolate({ inputRange: [i, i + 1], outputRange: [0, 0.5], extrapolate: 'clamp' });
  const opacity = pos.interpolate({ inputRange: [i + 0.98, i + 1], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: w,
        height: h,
        zIndex: 100 - i,
        opacity,
        transform: [{ perspective: 1600 }, { translateX: -pivot }, { rotateY }, { translateX: pivot }],
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: PAGE_PAD.paddingLeft, top: PAGE_PAD.paddingTop, right: PAGE_PAD.paddingRight, bottom: PAGE_PAD.paddingBottom, backgroundColor: C.inkDeep, opacity: shade }}
      />
    </Animated.View>
  );
}

/** The table from the render: vermillion stock (near-black for the press), grain, a vignette, and brand stickers peeking from under the booklet. */
export function Table({ press, city, joined }: { press: boolean; city: string; joined: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: press ? C.inkDeep : C.ink400 }}>
      <Grain opacity={0.12} />
      <LinearGradient colors={['rgba(27,16,4,0.28)', 'rgba(27,16,4,0)', 'rgba(27,16,4,0)', 'rgba(27,16,4,0.32)']} locations={[0, 0.2, 0.75, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {/* stickers on the table */}
      <View style={{ position: 'absolute', top: 24, left: -18, width: 64, height: 64, borderRadius: 32, backgroundColor: C.stampGreen, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] }}>
        <Banner s={9} tk={0.06} c={C.paper0} style={{ marginLeft: 16 }}>
          {city.toUpperCase().slice(0, 6)}
        </Banner>
      </View>
      <View style={{ position: 'absolute', top: '42%', right: -52, width: 96, height: 96, borderRadius: 48, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '12deg' }] }}>
        <Image source={BRAND.logo} style={{ width: 90, height: 90 }} contentFit="contain" />
      </View>
      <View style={{ position: 'absolute', top: '64%', left: -30, width: 58, height: 58, borderRadius: 29, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] }}>
        <Banner s={7.5} tk={0.08} c={C.ink400} style={{ marginLeft: 12 }}>
          EST.
        </Banner>
        <Display s={10} c={C.ink400} style={{ marginLeft: 12 }}>
          {joined.slice(-4)}
        </Display>
      </View>
    </View>
  );
}

/**
 * One page of the passport, in CRTQ's sticker stock: thick black outline and a
 * hard offset shadow, a sun-yellow spine (vermillion for the press), the
 * header band with the mascot, paper grain over a light guilloché, the mascot
 * watermark, the document number perforated through every page, and the page
 * number on a round sticker.
 */
export function PassportPage({
  w,
  h,
  wash,
  header,
  title,
  sub,
  no,
  docNo,
  press,
  footer,
  children,
}: {
  w: number;
  h: number;
  wash: string;
  header: string;
  title?: string;
  sub?: string;
  no: string;
  docNo: string;
  press?: boolean;
  footer?: React.ReactNode;
  children: (innerW: number) => React.ReactNode;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [innerW, setInnerW] = useState(0);
  const spine = press ? C.ink400 : C.sun400;
  return (
    <View style={{ width: w, height: h, ...PAGE_PAD }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
          {/* the spine, stitched */}
          <View style={{ width: 14, backgroundColor: spine, borderRightWidth: 2, borderRightColor: C.inkBlack }}>
            <View style={{ position: 'absolute', top: 8, bottom: 8, left: 5, borderLeftWidth: 2, borderLeftColor: C.inkBlack, borderStyle: 'dashed' }} />
          </View>
          <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <Guilloche width={box.w} height={box.h} color={wash} opacity={0.4} />
            <Grain opacity={0.05} />
            {/* the mascot watermark */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.07 }}>
              <Image source={BRAND.logo} style={{ width: Math.max(60, Math.min(250, box.w * 0.74)), height: Math.max(60, Math.min(250, box.w * 0.74)) }} contentFit="contain" />
            </View>
            {/* the document number, perforated through every page */}
            <View pointerEvents="none" style={{ position: 'absolute', right: 4, top: 52, alignItems: 'center', opacity: 0.4 }}>
              {docNo.split('').map((d, i) => (
                <Mono key={i} s={8} c={C.inkSoft} style={{ lineHeight: 10 }}>
                  {d}
                </Mono>
              ))}
            </View>
            {/* the header band */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 12, paddingVertical: 6, backgroundColor: spine, borderBottomWidth: 2, borderBottomColor: C.inkBlack }}>
              <Image source={BRAND.logo} style={{ width: 26, height: 26, transform: [{ rotate: '-8deg' }] }} contentFit="contain" />
              <Banner s={8.5} tk={0.16} c={press ? C.paper0 : C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                {header}
              </Banner>
              <Mono s={9} c={press ? C.paper0 : C.inkDeep}>
                Nº {docNo}
              </Mono>
            </View>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 14, paddingRight: 18, paddingTop: 14, paddingBottom: 16 }}>
              {title ? (
                <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <Display s={26} c={C.inkDeep}>
                    {title}
                  </Display>
                  {sub ? (
                    <View style={{ backgroundColor: C.sun100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, transform: [{ rotate: '-2deg' }] }}>
                      <Banner s={8} tk={0.08} c={C.inkDeep}>
                        {sub}
                      </Banner>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View onLayout={(e) => setInnerW(e.nativeEvent.layout.width)}>{children(innerW)}</View>
            </ScrollView>
            {footer}
            {/* the page number, on a round sticker */}
            <View style={{ alignItems: 'center', paddingVertical: 5, borderTopWidth: 2, borderTopColor: C.inkBlack, backgroundColor: C.paper0 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: spine, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Display s={11} c={press ? C.paper0 : C.inkDeep}>
                  {no}
                </Display>
              </View>
            </View>
          </View>
          <PageLight />
        </View>
      </View>
    </View>
  );
}

/** The cover: a CRTQ sticker — sun-yellow stock (vermillion for the press), the mascot, a slanted title band. */
export function CoverPage({ w, h, press, house, city, joined, onOpen, onShare }: { w: number; h: number; press: boolean; house?: boolean; city: string; joined: string; onOpen: () => void; onShare?: () => void }) {
  const stock = house ? C.stampGreen : press ? C.ink400 : C.sun400;
  const band = press ? C.inkDeep : C.ink400;
  const ink = press ? C.paper0 : C.inkDeep;
  return (
    <View style={{ width: w, height: h, ...PAGE_PAD }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: stock, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
          <Grain opacity={0.09} />
          {/* the spine, stitched */}
          <View style={{ width: 16, backgroundColor: band, borderRightWidth: 2.5, borderRightColor: C.inkBlack }}>
            <View style={{ position: 'absolute', top: 10, bottom: 10, left: 6, borderLeftWidth: 2, borderLeftColor: C.paper0, borderStyle: 'dashed' }} />
          </View>
          <Pressable onPress={onOpen} accessibilityLabel="Open passport" style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 22, paddingBottom: 20 }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Display s={46} c={ink}>
                CRTQ
              </Display>
              <Banner s={9.5} tk={0.3} c={ink}>
                {house ? 'CRITICS · HOUSE CRITIC' : press ? 'CRITICS · PRESS CORPS' : 'TASTE TRAVELLERS'}
              </Banner>
            </View>

            {/* the mascot, as a sticker */}
            <StickerView offset="lg" radius={999} style={{ transform: [{ rotate: '-6deg' }] }}>
              <View style={{ width: 172, height: 172, borderRadius: 86, backgroundColor: C.paper0, borderWidth: 3, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Image source={BRAND.logo} style={{ width: 164, height: 164 }} contentFit="contain" />
              </View>
            </StickerView>

            {/* the slanted title band */}
            <View style={{ alignSelf: 'stretch', marginHorizontal: -8, backgroundColor: band, borderTopWidth: 2.5, borderBottomWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 10, alignItems: 'center', transform: [{ rotate: '-3deg' }] }}>
              <Display s={press ? 20 : 26} c={C.paper0}>
                {house ? 'PASAPORTE DE LA CASA' : press ? 'PASAPORTE DE PRENSA' : 'PASAPORTE'}
              </Display>
              <Display s={press ? 11 : 15} c={press ? C.sun300 : C.sun300}>
                {house ? 'HOUSE CRITIC PASSPORT' : press ? 'PRESS PASSPORT' : 'GASTRONÓMICO'}
              </Display>
              {!press ? (
                <Banner s={8.5} tk={0.3} c={C.ink100} style={{ marginTop: 3 }}>
                  FOOD PASSPORT
                </Banner>
              ) : null}
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
              {/* the e-passport chip mark */}
              <Svg width={34} height={22} viewBox="0 0 34 22">
                <Path d="M3 1h28a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" stroke={ink} strokeWidth={1.8} fill="none" />
                <Circle cx={17} cy={11} r={5} stroke={ink} strokeWidth={1.8} fill="none" />
                <Line x1={1} y1={11} x2={12} y2={11} stroke={ink} strokeWidth={1.8} />
                <Line x1={22} y1={11} x2={33} y2={11} stroke={ink} strokeWidth={1.8} />
              </Svg>
              <Mono s={9} c={ink}>
                tap or swipe to open →
              </Mono>
            </View>
          </Pressable>

          {/* stickers slapped on the cover */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 104, left: 30, width: 58, height: 58, borderRadius: 29, backgroundColor: C.stampGreen, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-14deg' }] }}>
            <Banner s={10} tk={0.08} c={C.paper0}>
              {city.toUpperCase().slice(0, 6)}
            </Banner>
            <Mono s={7} c={C.greenFg}>
              ★ ★ ★
            </Mono>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', top: 258, right: 18, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 4, paddingHorizontal: 8, transform: [{ rotate: '9deg' }] }}>
            <Banner s={8} tk={0.12} c={C.ink400}>
              EST. {joined}
            </Banner>
          </View>

          {onShare ? (
          <Pressable onPress={onShare} accessibilityLabel="Share your passport" hitSlop={4} style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" stroke={C.ink400} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          ) : null}
          <PageLight dark />
        </View>
      </View>
    </View>
  );
}

/**
 * The booklet's pager: drag sideways to turn (the page follows your finger
 * around the spine), or call goTo from a page control. `pos` is the open page
 * as a float while turning; `onTurn` hears each settled page.
 */
export function useBookletPager(count: number, width: number, start = 0, onTurn?: (i: number) => void) {
  const [idx, setIdx] = useState(start);
  const pos = useRef(new Animated.Value(start)).current;
  const last = count - 1;
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(last, i));
    turnRef.current?.(n);
    setIdx(n);
    Animated.timing(pos, { toValue: n, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  const drag = useRef({ start, w: 1 });
  drag.current.w = width || 1;
  const pan = useMemo(
    () =>
      PanResponder.create({
        // only claim clearly horizontal drags, so inner pages still scroll vertically
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderTerminationRequest: () => false, // keep the turn once it has started
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          pos.stopAnimation((v: number) => (drag.current.start = v));
        },
        onPanResponderMove: (_e, g) => {
          const v = drag.current.start - g.dx / drag.current.w;
          pos.setValue(Math.max(-0.08, Math.min(last + 0.08, v)));
        },
        onPanResponderRelease: (_e, g) => {
          const v = drag.current.start - g.dx / drag.current.w - g.vx * 0.35;
          goTo(Math.round(v));
        },
        onPanResponderTerminate: () => goTo(Math.round(drag.current.start)),
      }),
    [width, last], // goTo and pos are stable for the gesture's lifetime
  );
  return { idx, pos, goTo, pan };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function Passport() {
  const insets = useSafeAreaInsets();
  const ranked = useStore((s) => s.ranked);
  const topFour = useStore((s) => s.topFour);
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
  const [area, setArea] = useState({ w: 0, h: 0 });
  // Opened on a specific page (e.g. your data page from "You" in a fan list).
  const passportAt = useStore((s) => s.passportAt);
  if (passportAt) {
    const at = PAGES.findIndex((p) => p.key === passportAt);
    if (at >= 0) lastPage = at;
  }
  useEffect(() => {
    if (passportAt) useStore.setState({ passportAt: null });
  }, [passportAt]);
  const { idx, pos, goTo, pan } = useBookletPager(PAGES.length, area.w, lastPage, (n) => (lastPage = n));

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
  const header = critic ? 'PASAPORTE DE PRENSA · PRESS' : 'PASAPORTE · FOOD PASSPORT';

  const hostEvent = () => {
    go('table');
    openCreate('event');
  };

  const page = (key: PageKey, children: (w: number) => React.ReactNode, footer?: React.ReactNode) => {
    const p = PAGES.find((x) => x.key === key)!;
    return (
      <PassportPage key={key} w={area.w} h={area.h} wash={p.wash} header={header} title={p.title} sub={p.sub} no={p.no} docNo={no} press={critic} footer={footer}>
        {children}
      </PassportPage>
    );
  };

  const dataPage = () => (
    <View accessibilityLabel="Passport data page">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Mono s={9} c={C.inkMuted}>
          TIPO / TYPE <Mono s={9} c={critic ? C.ink500 : C.inkDeep}>{critic ? 'D · PRENSA' : 'P'}</Mono>
        </Mono>
        {/* holographic papel picado: the holder's palate print */}
        <View pointerEvents="none" style={{ opacity: 0.45 }}>
          <PapelPicado palate={palate} seed={me.handle || me.name} width={100} height={24} flags={5} hole={C.paper0} />
        </View>
        <Mono s={9} c={C.inkMuted}>
          CRTQ
        </Mono>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 14 }}>
        <View>
          <View style={{ width: 92, height: 118, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: col(me.color), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {me.avatarUrl ? (
              <Image source={{ uri: me.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Display s={32} c={C.paper0}>
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
            <View pointerEvents="none" style={{ position: 'absolute', right: -6, bottom: -14, width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.ink400, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-14deg' }], backgroundColor: 'rgba(255,253,245,0.82)' }}>
              <Banner s={7} tk={0.12} c={C.ink400}>
                {homeCity.name.toUpperCase().slice(0, 6)}
              </Banner>
              <Display s={11.5} c={C.ink400}>
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
                <Mono s={13.5} c={C.inkDeep} numberOfLines={1}>
                  {`${surname}, ${given}`.toUpperCase()}
                </Mono>
              </View>
              <View>
                <FieldLabel>FUENTE / BEAT</FieldLabel>
                <SerifItalic s={17} c={C.ink500} numberOfLines={1}>
                  {me.beat || 'CDMX dining'}
                </SerifItalic>
              </View>
              <View>
                <FieldLabel>ACREDITACIÓN / VERIFIED</FieldLabel>
                <Mono s={11} c={C.stampGreen}>
                  ✓ VERIFIED CRITIC
                </Mono>
              </View>
            </>
          ) : (
            <>
              <View>
                <FieldLabel>APELLIDOS / SURNAME</FieldLabel>
                <Mono s={13.5} c={C.inkDeep} numberOfLines={1}>
                  {surname.toUpperCase()}
                </Mono>
              </View>
              <View>
                <FieldLabel>NOMBRES / GIVEN NAMES</FieldLabel>
                <Mono s={13.5} c={C.inkDeep} numberOfLines={1}>
                  {given.toUpperCase()}
                </Mono>
              </View>
              <View>
                <FieldLabel>PALADAR / PALATE</FieldLabel>
                <SerifItalic s={17} c={C.ink500} numberOfLines={1}>
                  {archTitle}
                </SerifItalic>
              </View>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View>
              <FieldLabel>CIUDAD / HOME</FieldLabel>
              <Mono s={10.5} c={C.inkDeep}>
                {homeCity.name.toUpperCase()}
              </Mono>
            </View>
            <View>
              <FieldLabel>EXPEDICIÓN / ISSUED</FieldLabel>
              <Mono s={10.5} c={C.inkDeep}>
                {me.joined}
              </Mono>
            </View>
          </View>
        </View>
      </View>

      {/* Mis cuatro — the four restaurants the holder features, first thing on the profile */}
      <View style={{ marginTop: 20 }} accessibilityLabel="Your Top 4">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <FieldLabel>MIS CUATRO / TOP 4</FieldLabel>
          <View style={{ flex: 1, height: 1.5, backgroundColor: C.paper300 }} />
          {topFour.some(Boolean) ? (
            <Mono s={7.5} c={C.inkMuted}>
              tap to swap
            </Mono>
          ) : null}
        </View>
        <TopFourGrid top={topFour} editable variant="row" />
      </View>

      {/* the holder's record */}
      <View style={{ marginTop: 18 }}>
      <StickerView offset="sm" style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.sun50 }}>
        {record.map((r, i) => (
          <View key={r.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRightWidth: i < record.length - 1 ? 2 : 0, borderColor: C.inkBlack }}>
            <Display s={19} c={C.ink400}>
              {r.v}
            </Display>
            <Banner s={6.5} tk={0.12} c={C.inkMuted}>
              {r.l}
            </Banner>
          </View>
        ))}
      </StickerView>
      </View>

      {/* signature: the holder's manifesto (written on the Observaciones page) */}
      <View style={{ paddingTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Pressable onPress={() => goTo(NOTES_PAGE)} accessibilityLabel={me.bio ? 'Holder’s signature' : 'Sign your passport'} style={{ flex: 1, minWidth: 0 }}>
          <FieldLabel>FIRMA DEL TITULAR / HOLDER'S SIGNATURE</FieldLabel>
          <View style={{ borderBottomWidth: 1.5, borderBottomColor: C.paper300, paddingBottom: 5, marginTop: 3 }}>
            <SerifItalic s={15.5} c={me.bio ? C.inkDeep : C.inkMuted} numberOfLines={3}>
              {me.bio ? `“${me.bio}”` : profile ? 'Sign your passport — write your note →' : `“${archBlurb}”`}
            </SerifItalic>
          </View>
        </Pressable>
        {/* the ghost portrait */}
        <View pointerEvents="none" style={{ width: 48, height: 62, borderWidth: 1, borderColor: C.paper300, alignItems: 'center', justifyContent: 'center', opacity: 0.35, backgroundColor: C.paper100 }}>
          <Display s={17} c={col(me.color)}>
            {me.initials}
          </Display>
        </View>
      </View>

      {/* the critic's desk — press passports only */}
      {critic ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <FieldLabel>ESCRITORIO DEL CRÍTICO / CRITIC'S DESK</FieldLabel>
          <StickerPressable offset="sm" radius={999} onPress={hostEvent} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.inkDeep, minHeight: 46 }}>
            <PlusIcon size={14} color={C.sun400} sw={2.6} />
            <Banner s={11} tk={0.12} c={C.paper0}>
              Host an event
            </Banner>
          </StickerPressable>
          <Mono s={9} c={C.inkMuted}>
            {eventsHosted === 0 ? 'No events yet — they publish to the calendar under your press seal.' : `${eventsHosted} event${eventsHosted > 1 ? 's' : ''} hosted`}
          </Mono>
        </View>
      ) : null}
    </View>
  );

  const mrz = (
    <View accessibilityLabel={`Machine-readable zone: ${ranked.length} stamps, ${terr.visited} colonias, ${visas} visas`} style={{ backgroundColor: C.paper100, borderTopWidth: 2, borderTopColor: C.paper300, borderStyle: 'dashed', paddingVertical: 8, paddingHorizontal: 8 }}>
      <Mono s={9.6} c={C.inkBlack} style={{ letterSpacing: 0.4, lineHeight: 15 }} numberOfLines={1}>
        {mrz1}
      </Mono>
      <Mono s={9.6} c={C.inkBlack} style={{ letterSpacing: 0.4, lineHeight: 15 }} numberOfLines={1}>
        {mrz2}
      </Mono>
    </View>
  );

  const settingsPage = () => (
    <View style={{ gap: 20 }}>
      {profile && !critic ? (
        <View>
          <SectionLabel>{t('you.criticAccess').toUpperCase()}</SectionLabel>
          <BecomeCriticCard onVerify={becomeCritic} />
        </View>
      ) : null}
      <View>
        <SectionLabel>TRIAL & SYNC</SectionLabel>
        <TrialPanel />
      </View>
      <View>
        <SectionLabel>{t('you.language').toUpperCase()}</SectionLabel>
        <LangPicker showLabels size={42} />
      </View>
      <View>
        <SectionLabel>{t('you.account').toUpperCase()}</SectionLabel>
        <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 12, gap: 10 }}>
          <View>
            <Banner s={11} tk={0.06} c={C.inkDeep}>
              {me.handle}
            </Banner>
            <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
              {profile && me.email ? `${t('you.googleAccount')} · ${me.email}` : critic ? 'Verified Critic' : profile ? 'Passport' : 'Guest · demo identity'}
            </Mono>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {critic ? (
              <StickerPressable offset="sm" radius={999} onPress={stepDownCritic} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13 }}>
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
    </View>
  );

  const cur = PAGES[idx] || PAGES[0];

  const pages: React.ReactNode[] = [
    <CoverPage key="cover" w={area.w} h={area.h} press={critic} city={homeCity.name} joined={me.joined} onOpen={() => goTo(1)} onShare={openTasteCard} />,
    page('data', () => dataPage(), mrz),
    page('favs', () => <FavsPage ranked={ranked} />),
    page('visas', () => <VisasPage sets={album} pending={pending} />),
    page('stamps', (w) => <StampsPage tiles={terr.tiles} visited={terr.visited} elsewhere={terr.elsewhere} ranked={ranked} width={w} />),
    page('bio', (w) => <BioPage palate={palate} avg={avg} chase={chase} seed={me.handle || me.name} width={w} />),
    page('notes', () => <NotesPage courses={courses} bio={me.bio} canEdit={!!profile} archBlurb={archBlurb} />),
    page('settings', () => settingsPage()),
  ];

  return (
    <ScreenIn>
      <View style={{ flex: 1, paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 12) + 74 }}>
        {/* the table from the 3D render, with stickers peeking from under the booklet */}
        <Table press={critic} city={homeCity.name} joined={me.joined} />
        <View style={{ flex: 1 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {area.w ? <BookletBase w={area.w} h={area.h} press={critic} /> : null}
          {area.w ? (
            <View {...pan.panHandlers} style={{ position: 'absolute', top: 0, left: 0, width: area.w, height: area.h }}>
              {pages.map((node, i) =>
                i >= idx - 1 && i <= idx + 2 ? (
                  <TurnPage key={PAGES[i].key} i={i} w={area.w} h={area.h} pos={pos} active={i === idx}>
                    {node}
                  </TurnPage>
                ) : null,
              )}
            </View>
          ) : null}
        </View>

        {/* the page control */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4 }}>
          <StickerPressable offset={idx === 0 ? 'none' : 'sm'} radius={999} onPress={() => goTo(idx - 1)} disabled={idx === 0} accessibilityLabel="Previous page" style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: idx === 0 ? 'rgba(255,253,245,0.35)' : C.inkBlack, alignItems: 'center', justifyContent: 'center', backgroundColor: idx === 0 ? 'transparent' : C.sun400 }}>
            <Chevron dir="left" color={idx === 0 ? 'rgba(255,253,245,0.45)' : C.inkDeep} />
          </StickerPressable>
          <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {PAGES.map((p, i) => (
                <Pressable key={p.key} onPress={() => goTo(i)} accessibilityLabel={`Page: ${p.name}`} accessibilityState={{ selected: i === idx }} hitSlop={8} style={{ width: i === idx ? 24 : 11, height: 11, borderRadius: 6, backgroundColor: i === idx ? C.sun400 : C.paper0, borderWidth: 2, borderColor: C.inkBlack, opacity: i === idx ? 1 : 0.85 }} />
              ))}
            </View>
            <Mono s={9.5} c={C.paper0} numberOfLines={1}>
              {cur.key === 'cover' ? 'COVER · PORTADA' : cur.key === 'data' ? 'p. 1 · DATA PAGE' : `p. ${cur.no} · ${cur.title}`}
            </Mono>
          </View>
          <StickerPressable offset={idx === PAGES.length - 1 ? 'none' : 'sm'} radius={999} onPress={() => goTo(idx + 1)} disabled={idx === PAGES.length - 1} accessibilityLabel="Next page" style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: idx === PAGES.length - 1 ? 'rgba(255,253,245,0.35)' : C.inkBlack, alignItems: 'center', justifyContent: 'center', backgroundColor: idx === PAGES.length - 1 ? 'transparent' : C.sun400 }}>
            <Chevron dir="right" color={idx === PAGES.length - 1 ? 'rgba(255,253,245,0.45)' : C.inkDeep} />
          </StickerPressable>
        </View>
      </View>
    </ScreenIn>
  );
}
