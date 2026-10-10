/**
 * You — a profile made of where you ate, not of posts or follower counts.
 *
 * The header hangs your **papel picado**: cut-paper flags generated from your
 * palate (colours = your cuisines, cut-outs = your strongest axes), so no two
 * profiles look alike. Below it, your passport opens like a booklet:
 *
 *  - Menu: your rankings plated as a tasting menu — one restaurant per course,
 *    the dish you'd order there, your manifesto as the chef's note, and what's
 *    next on the menu (your want-to-try).
 *  - Territory: a schematic map of CDMX colonias, stamped where you've eaten,
 *    with what to try next in each.
 *  - Album: collectable guide stamps (Michelin stars, 50 Best, Bib Gourmand,
 *    2026 openings) and the next one to collect.
 *  - Palate: the radar, flavour DNA, go-to order and palates like yours.
 *
 * Verified CRITICS keep their press pass: the seal, critic stats and a Critic's
 * Desk for hosting curated events.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { scoreStyle, fmt } from '../store/helpers';
import { C, col } from '../theme/tokens';
import { identity, isCritic, formatFollowers, CRITIC_BEATS } from '../data/profile';
import { computePalate, friendPalate, tasteMatch, PALATE_AXES, type Palate } from '../data/palate';
import { FRIENDS, byId, type Place } from '../store/data';
import { cityById } from '../data/cities';
import { CARTE_CDMX } from '../data/carte';
import { tastingMenu, territory, guideAlbum, guideTwin, GRID_COLS, GRID_ROWS, type Course, type HoodTile, type AlbumSet } from '../data/youProfile';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { LangPicker } from '../components/LangPicker';
import { PalateRadar } from '../components/PalateRadar';
import { Roundel } from '../components/Roundel';
import { Monogram } from '../components/Monogram';
import { PapelPicado, MOTIF_GLYPH } from '../components/PapelPicado';
import { Grain } from '../components/Grain';
import { PlusIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

type Page = 'menu' | 'territory' | 'album' | 'palate';
const PAGES: { key: Page; label: string }[] = [
  { key: 'menu', label: 'Menu' },
  { key: 'territory', label: 'Territory' },
  { key: 'album', label: 'Album' },
  { key: 'palate', label: 'Palate' },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function StatCell({ value, label, last }: { value: string | number; label: string; last?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRightWidth: last ? 0 : 2, borderColor: C.paper0 }}>
      <Display s={21} c={C.sun400}>
        {value}
      </Display>
      <Banner s={7.5} tk={0.14} c={C.ink100}>
        {label}
      </Banner>
    </View>
  );
}

/** Small vermillion verified seal used next to a critic's name. */
function CriticSeal() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
      <Banner s={9} c={C.paper0}>
        ✓
      </Banner>
      <Banner s={8} tk={0.12} c={C.paper0}>
        CRITIC
      </Banner>
    </View>
  );
}

function BecomeCriticCard({ onVerify }: { onVerify: (beat: string) => void }) {
  const [beat, setBeat] = useState(CRITIC_BEATS[0]);
  return (
    <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
          <Banner s={13} c={C.paper0}>
            ✓
          </Banner>
        </View>
        <View style={{ flex: 1 }}>
          <Banner s={13} tk={0.04} c={C.inkDeep}>
            Become a verified Critic
          </Banner>
          <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
            A verified profile · host events at restaurants
          </Mono>
        </View>
      </View>
      <Serif s={12.5} c={C.inkMuted} style={{ lineHeight: 18 }}>
        Critics carry a press seal, their verdicts stand out, and they can put curated events on the community calendar.
      </Serif>
      <Mono s={9} c={C.inkSoft}>
        YOUR BEAT
      </Mono>
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
      <StickerPressable offset="sm" radius={999} onPress={() => onVerify(beat)} style={{ marginTop: 4, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 13 }}>
        <Banner s={12.5} tk={0.1} c={C.paper0}>
          Get verified as a Critic
        </Banner>
      </StickerPressable>
      <Mono s={8.5} c={C.inkSoft} style={{ textAlign: 'center' }}>
        Pilot: instant for testers · real verification lands with the backend
      </Mono>
    </StickerView>
  );
}


/** Section label used inside the booklet pages. */
function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {children}
      </Banner>
      {right}
    </View>
  );
}

/** A small ornament rule, like on a printed menu. */
function Ornament() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10, paddingHorizontal: 30 }}>
      <View style={{ flex: 1, height: 1.5, backgroundColor: C.ink200 }} />
      <Display s={11} c={C.ink400}>
        ✦
      </Display>
      <View style={{ flex: 1, height: 1.5, backgroundColor: C.ink200 }} />
    </View>
  );
}

// ── Menu ──────────────────────────────────────────────────────────────────────

function MenuPage({
  courses,
  firstName,
  cityName,
  next,
  bio,
  canEdit,
  archBlurb,
}: {
  courses: Course[];
  firstName: string;
  cityName: string;
  next: Place[];
  bio?: string;
  canEdit: boolean;
  archBlurb: string;
}) {
  const openPlace = useStore((s) => s.openPlace);
  const go = useStore((s) => s.go);
  const setBio = useStore((s) => s.setBio);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <View style={{ gap: 18 }}>
      <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 20, paddingHorizontal: 16, overflow: 'hidden' }}>
        <Grain opacity={0.05} />
        {/* double rule frame, like a printed carte */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: C.ink200 }} />
        <View style={{ alignItems: 'center' }}>
          <Banner s={10} tk={0.3} c={C.ink400}>
            Menú degustación
          </Banner>
          <SerifDisplay s={24} c={C.inkDeep} style={{ marginTop: 4, textAlign: 'center' }}>
            de {firstName}
          </SerifDisplay>
          <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 4 }}>
            {courses.length ? `${courses.length} tiempos · ${cityName} · served from your rankings` : cityName}
          </Mono>
        </View>
        <Ornament />
        {courses.length ? (
          courses.map((c, i) => (
            <Pressable key={c.key} onPress={() => openPlace(c.place.id)} accessibilityLabel={`${c.es}: ${c.place.name}`} style={{ alignItems: 'center', paddingVertical: 9 }}>
              <Banner s={8.5} tk={0.2} c={C.inkMuted}>
                {ROMAN[i]} · {c.es}
              </Banner>
              <SerifDisplay s={19} c={C.inkDeep} style={{ marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
                {c.place.name}
              </SerifDisplay>
              {c.dish ? (
                <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 2, textAlign: 'center', lineHeight: 18 }} numberOfLines={2}>
                  {c.dish}
                </SerifItalic>
              ) : null}
              <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 3 }}>
                {[c.place.hood, c.en, c.score != null ? `your ${fmt(c.score)}` : ''].filter(Boolean).join(' · ')}
              </Mono>
            </Pressable>
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 10, gap: 10 }}>
            <SerifItalic s={14} c={C.inkMuted} style={{ textAlign: 'center', lineHeight: 20 }}>
              Your menu writes itself as you rank — each place you log can become a course.
            </SerifItalic>
            <StickerPressable offset="sm" radius={999} onPress={() => go('log')} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 18 }}>
              <Banner s={10} tk={0.1} c={C.paper0}>
                Rank your first place
              </Banner>
            </StickerPressable>
          </View>
        )}
        <Ornament />
        {/* the chef's note — the foodie's manifesto */}
        <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
          <Banner s={8.5} tk={0.2} c={C.inkMuted}>
            Nota del chef
          </Banner>
          {editing ? (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('you.manifestoPrompt')}
                placeholderTextColor={C.inkSoft}
                multiline
                autoFocus
                maxLength={280}
                style={{ minHeight: 70, textAlignVertical: 'top', fontFamily: 'Fraunces_400Regular', fontSize: 14.5, lineHeight: 21, color: C.inkBlack, borderWidth: 1.5, borderColor: C.ink200, padding: 8 }}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'center' }}>
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
            <Pressable
              disabled={!canEdit}
              onPress={() => {
                setDraft(bio || '');
                setEditing(true);
              }}
              accessibilityLabel={bio ? 'Edit your chef’s note' : 'Write your chef’s note'}
              style={{ marginTop: 6, alignItems: 'center' }}
            >
              <SerifItalic s={14.5} c={bio ? C.inkDeep : C.inkMuted} style={{ textAlign: 'center', lineHeight: 21 }}>
                “{bio || archBlurb}”
              </SerifItalic>
              {canEdit ? (
                <Mono s={8.5} c={C.ink400} style={{ marginTop: 6 }}>
                  {bio ? t('you.edit') : t('you.write')}
                </Mono>
              ) : null}
            </Pressable>
          )}
        </View>
      </StickerView>

      {/* what's next on the menu — the want-to-try list */}
      {next.length ? (
        <View>
          <Label>Next on the menu</Label>
          <View style={{ gap: 8 }}>
            {next.map((p) => (
              <StickerPressable
                key={p.id}
                offset="sm"
                onPress={() => openPlace(p.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.sun50, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 8, paddingHorizontal: 11, borderStyle: 'dashed' }}
              >
                <Monogram name={p.name} size={34} rot="-5deg" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Banner s={11} tk={0.04} c={C.inkDeep} numberOfLines={1}>
                    {p.name}
                  </Banner>
                  <Mono s={8.5} c={C.inkMuted} numberOfLines={1}>
                    {[p.hood, p.category || p.cuisine, p.price].filter(Boolean).join(' · ')}
                  </Mono>
                </View>
                <Mono s={8.5} c={C.ink400}>
                  reserved seat →
                </Mono>
              </StickerPressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Territory ─────────────────────────────────────────────────────────────────

function TerritoryPage({ tiles, visited, elsewhere, width }: { tiles: HoodTile[]; visited: number; elsewhere: Place[]; width: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const ranked = useStore((s) => s.ranked);
  const firstVisited = useMemo(() => tiles.slice().sort((a, b) => b.mine.length - a.mine.length)[0]?.key, [tiles]);
  const [sel, setSel] = useState<string | undefined>(firstVisited);
  const gap = 5;
  const tile = Math.floor((width - gap * (GRID_COLS - 1)) / GRID_COLS);
  const cur = tiles.find((t) => t.key === sel);
  const beenGuide = useMemo(() => new Set(ranked.map((r) => guideTwin(r, true)?.id).filter(Boolean) as string[]), [ranked]);
  const toTry = cur ? cur.guide.filter((g) => !beenGuide.has(g.id)).slice(0, 3) : [];

  return (
    <View style={{ gap: 14 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Display s={34} c={C.ink400}>
            {visited}
          </Display>
          <Serif s={14} c={C.inkDeep} style={{ marginBottom: 6 }}>
            of {tiles.length} colonias eaten in
          </Serif>
        </View>
        <View style={{ height: 10, marginTop: 4, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden', backgroundColor: C.paper100 }}>
          <View style={{ width: `${Math.max(3, (visited / Math.max(1, tiles.length)) * 100)}%`, height: '100%', backgroundColor: C.ink400 }} />
        </View>
      </View>

      {/* the schematic: west → east, north on top */}
      {width > 0 ? (
        <View style={{ height: GRID_ROWS * tile + (GRID_ROWS - 1) * gap }}>
          {tiles.map((t, i) => {
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
                  backgroundColor: on ? t.color : C.paper0,
                  borderWidth: active ? 3 : 2,
                  borderColor: active ? C.sun500 : on ? C.inkBlack : C.ink200,
                  borderStyle: on ? 'solid' : 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: on ? [{ rotate: i % 2 ? '6deg' : '-7deg' }] : undefined,
                }}
              >
                <Banner s={tile > 46 ? 10 : 8.5} tk={0.04} c={on ? C.paper0 : C.inkSoft}>
                  {t.abbr}
                </Banner>
                {on ? (
                  <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.sun400, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <Mono s={8} c={C.inkDeep}>
                      {t.mine.length}
                    </Mono>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Mono s={8} c={C.inkSoft}>
        N ↑ · schematic of the guide's colonias, west → east · tap one
      </Mono>

      {cur ? (
        <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 13, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <SerifDisplay s={19} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
              {cur.name}
            </SerifDisplay>
            <Mono s={8.5} c={C.inkMuted}>
              {cur.mine.length ? `${cur.mine.length} yours · ` : ''}
              {cur.guide.length} in the guide
            </Mono>
          </View>
          {cur.mine.map((p) => (
            <Pressable key={p.id} onPress={() => openPlace(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
              <Banner s={10.5} tk={0.04} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                {p.name}
              </Banner>
              {p.score != null ? (
                <Mono s={9} c={C.inkMuted}>
                  {fmt(p.score)}
                </Mono>
              ) : null}
            </Pressable>
          ))}
          {toTry.length ? (
            <>
              <Banner s={8.5} tk={0.16} c={C.inkMuted} style={{ marginTop: cur.mine.length ? 4 : 0 }}>
                {cur.mine.length ? 'Still to try here' : 'Start here'}
              </Banner>
              {toTry.map((g) => (
                <Pressable key={g.id} onPress={() => openPlace(g.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink400 }} />
                  <Serif s={13} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                    {g.name}
                  </Serif>
                  <Mono s={8.5} c={C.ink400}>
                    →
                  </Mono>
                </Pressable>
              ))}
            </>
          ) : null}
        </StickerView>
      ) : null}

      {elsewhere.length ? (
        <Mono s={8.5} c={C.inkSoft}>
          Also eaten beyond the map: {elsewhere.map((p) => p.name).join(' · ')}
        </Mono>
      ) : null}
    </View>
  );
}

// ── Album ─────────────────────────────────────────────────────────────────────

const ALBUM_SLOTS = 10;

function AlbumPage({ sets }: { sets: AlbumSet[] }) {
  const openPlace = useStore((s) => s.openPlace);
  return (
    <View style={{ gap: 14 }}>
      {sets.map((s) => {
        const empty = Math.max(0, Math.min(ALBUM_SLOTS, s.all.length) - s.got.length);
        const more = s.all.length - s.got.length - empty;
        return (
          <StickerView key={s.key} offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 13 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Banner s={12} tk={0.06} c={C.inkDeep}>
                {s.label}
              </Banner>
              <Display s={15} c={s.got.length ? C.ink400 : C.inkSoft}>
                {s.got.length}
                <Mono s={10} c={C.inkMuted}>
                  {' '}
                  / {s.all.length}
                </Mono>
              </Display>
            </View>
            <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 2 }}>
              {s.note}
            </Mono>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {s.got.map((p, i) => (
                <Pressable key={p.id} onPress={() => openPlace(p.id)} accessibilityLabel={`Stamp: ${p.name}`}>
                  <Monogram name={p.name} size={36} rot={i % 2 ? '8deg' : '-9deg'} />
                </Pressable>
              ))}
              {Array.from({ length: empty }).map((_, i) => (
                <View key={i} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.ink200, borderStyle: 'dashed' }} />
              ))}
              {more > 0 ? (
                <View style={{ height: 36, justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Mono s={9} c={C.inkSoft}>
                    +{more}
                  </Mono>
                </View>
              ) : null}
            </View>
            {s.next ? (
              <Pressable onPress={() => openPlace(s.next!.id)} accessibilityLabel={`Next to collect: ${s.next.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: C.sun100 }}>
                <Mono s={8.5} c={C.inkMuted}>
                  next to collect
                </Mono>
                <Banner s={9.5} tk={0.04} c={C.inkDeep} numberOfLines={1}>
                  {s.next.name} →
                </Banner>
              </Pressable>
            ) : null}
          </StickerView>
        );
      })}
    </View>
  );
}

// ── Palate ────────────────────────────────────────────────────────────────────

function PalatePage({ palate, avg, chase }: { palate: Palate; avg: string; chase: string[] }) {
  const openFoodie = useStore((s) => s.openFoodie);
  const openTasteCard = useStore((s) => s.openTasteCard);
  const ranked = useStore((s) => s.ranked);
  const t = useT();
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));
  const dnaTotal = palate.topCuisines.reduce((sum, c) => sum + c.count, 0) || 1;
  const closest = FRIENDS.map((f) => ({ f, m: tasteMatch(palate, friendPalate(f)) }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 3);
  const recentStamps = ranked.slice(0, 6);

  return (
    <View style={{ gap: 22 }}>
      <View>
        <Label
          right={
            <Pressable onPress={openTasteCard}>
              <Banner s={9.5} tk={0.1} c={C.ink400}>
                ⤴ {t('you.shareCard')}
              </Banner>
            </Pressable>
          }
        >
          {t('you.tasteId')}
        </Label>
        <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 16, overflow: 'hidden' }}>
          <Grain opacity={0.05} />
          <View style={{ alignItems: 'center' }}>
            <PalateRadar axes={palate.axes} labels={axisLabels} size={232} />
          </View>
          <Mono s={9.5} c={C.inkMuted} style={{ textAlign: 'center', marginTop: 4 }}>
            {palate.sampleSize} {t('stat.ranked').toLowerCase()} · {palate.distinct} {t('stat.cuisines').toLowerCase()} · {t('stat.avg')} {avg}
          </Mono>
        </StickerView>
      </View>

      {palate.topCuisines.length ? (
        <View>
          <Label>{t('you.flavorDna')}</Label>
          <View style={{ flexDirection: 'row', height: 18, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
            {palate.topCuisines.map((c, i) => (
              <View key={c.name} style={{ width: `${(c.count / dnaTotal) * 100}%`, backgroundColor: c.color, borderRightWidth: i < palate.topCuisines.length - 1 ? 2 : 0, borderColor: C.inkBlack }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11 }}>
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

      {recentStamps.length ? (
        <View>
          <Label>{t('you.stamps')}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {recentStamps.map((r, i) => {
              const ss = scoreStyle(r.score!);
              return (
                <View key={r.id} style={{ width: 76, alignItems: 'center', gap: 5 }}>
                  <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: i % 2 ? '4deg' : '-5deg' }] }}>
                    <Roundel size={72} bg={ss.bg} fg={ss.fg} text={fmt(r.score!)} textSize={22} dashInset={6} />
                  </StickerView>
                  <Mono s={8.5} c={C.inkMuted} numberOfLines={1} style={{ textAlign: 'center' }}>
                    {r.name}
                  </Mono>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {chase.length ? (
        <View>
          <Label>{t('you.chase')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {chase.map((name) => (
              <StickerView key={name} offset="sm" radius={999} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Banner s={10} tk={0.1} c={C.inkDeep}>
                  {name}
                </Banner>
              </StickerView>
            ))}
          </View>
        </View>
      ) : null}

      {palate.goToDishes.length ? (
        <View>
          <Label>{t('you.goto')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {palate.goToDishes.map((d) => (
              <StickerView key={d} offset="sm" style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 12, transform: [{ rotate: '-1deg' }] }}>
                <SerifItalic s={13} c={C.inkDeep}>
                  {d}
                </SerifItalic>
              </StickerView>
            ))}
          </View>
        </View>
      ) : null}

      {closest.length ? (
        <View>
          <Label>{t('you.closest')}</Label>
          <View style={{ gap: 8 }}>
            {closest.map(({ f, m }) => {
              const fp = friendPalate(f);
              const mc = m >= 80 ? C.stampGreen : m >= 60 ? C.sun500 : C.ink400;
              return (
                <StickerPressable
                  key={f.id}
                  offset="sm"
                  onPress={() => openFoodie(f.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 12 }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: col(f.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
                    <Banner s={11} c={C.paper0}>
                      {f.initials}
                    </Banner>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Banner s={11.5} tk={0.04} c={C.inkDeep} numberOfLines={1}>
                      {f.name}
                    </Banner>
                    <SerifItalic s={12} c={C.inkMuted} numberOfLines={1}>
                      {t('arch.' + fp.archId + '.t')}
                    </SerifItalic>
                  </View>
                  <View style={{ alignItems: 'center', backgroundColor: mc, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                    <Banner s={12} c={C.paper0}>
                      {m}%
                    </Banner>
                  </View>
                </StickerPressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
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
  const [page, setPage] = useState<Page>('menu');
  const [bandW, setBandW] = useState(0);
  const [pageW, setPageW] = useState(0);

  const me = identity(profile);
  const critic = isCritic(profile);
  const homeCity = cityById(me.cityId);
  const beenTotal = ranked.length;
  const scores = ranked.map((r) => r.score!).filter((n) => n != null);
  const avg = scores.length ? fmt(scores.reduce((a, b) => a + b, 0) / scores.length) : '0.0';
  const eventsHosted = createdTables.filter((tb: any) => tb.critic).length;

  const palate = useMemo(() => computePalate(ranked, tastes, userReviews), [ranked, tastes, userReviews]);
  const chase = tastes.length ? tastes : palate.topCuisines.map((c) => c.name);
  const archTitle = t('arch.' + palate.archId + '.t');
  const archBlurb = t('arch.' + palate.archId + '.b');
  const courses = useMemo(() => tastingMenu(ranked, userReviews), [ranked, userReviews]);
  const terr = useMemo(() => territory(ranked), [ranked]);
  const album = useMemo(() => guideAlbum(ranked), [ranked]);
  const stampsGot = useMemo(() => new Set(album.flatMap((s) => s.got.map((p) => p.id))).size, [album]);
  const next = useMemo(() => {
    const find = (id: string) => nearby.find((p) => p.id === id) || byId[id] || CARTE_CDMX.find((p) => p.id === id);
    return wantIds.map(find).filter(Boolean).slice(0, 3) as Place[];
  }, [wantIds, nearby]);
  const motifs = palate.axes
    .slice()
    .sort((a, b) => b.value - a.value)
    .filter((a) => a.value > 0.05)
    .slice(0, 3);

  const hostEvent = () => {
    go('table');
    openCreate('event');
  };

  return (
    <ScreenIn>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* the band: papel picado + identity */}
        <View style={{ backgroundColor: C.ink700, paddingTop: insets.top + 4, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack, overflow: 'hidden' }}>
          <Grain opacity={0.08} />
          <View onLayout={(e) => setBandW(e.nativeEvent.layout.width)}>
            <PapelPicado palate={palate} seed={me.handle || me.name} width={bandW} hole={C.ink700} />
          </View>
          <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: col(me.color), borderWidth: 2.5, borderColor: critic ? C.sun400 : C.inkBlack, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {me.avatarUrl ? (
                    <Image source={{ uri: me.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Banner s={19} c={C.paper0}>
                      {me.initials}
                    </Banner>
                  )}
                </View>
                {critic ? (
                  <View style={{ position: 'absolute', bottom: -6, left: 6, right: 6, alignItems: 'center', backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, paddingVertical: 1, transform: [{ rotate: '-6deg' }] }}>
                    <Banner s={7.5} tk={0.18} c={C.paper0}>
                      PRESS
                    </Banner>
                  </View>
                ) : null}
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Display s={22} c={C.paper0} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {me.name}
                  </Display>
                  {critic ? <CriticSeal /> : null}
                </View>
                <SerifItalic s={15} c={C.sun300} numberOfLines={1} style={{ marginTop: 2 }}>
                  {archTitle}
                </SerifItalic>
                <Mono s={8.5} c={C.ink100} style={{ marginTop: 3 }} numberOfLines={1}>
                  {critic ? "CRITIC'S PASS" : 'PASSPORT'} Nº {me.passportNo.toLocaleString()} · {critic ? me.beat || 'CDMX dining' : homeCity.name} · EST. {me.joined}
                </Mono>
              </View>
              <Pressable onPress={openTasteCard} accessibilityLabel={t('you.shareCard')} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
                <Banner s={14} c={C.paper0}>
                  ⤴
                </Banner>
              </Pressable>
            </View>
            {/* the banner's key: how it was cut */}
            <Mono s={8} c={C.ink200} style={{ marginTop: 10 }} numberOfLines={1}>
              Papel picado cut from your palate: {motifs.length ? motifs.map((m) => `${MOTIF_GLYPH[m.key]} ${t('axis.' + m.key)}`).join(' · ') : 'rank a few places to cut yours'}
            </Mono>
            {/* quiet numbers — what you've eaten, not who follows you */}
            <View style={{ flexDirection: 'row', marginTop: 12, borderWidth: 2, borderColor: C.paper0 }}>
              {critic ? (
                <>
                  <StatCell value={beenTotal} label={t('stat.verdicts')} />
                  <StatCell value={eventsHosted} label={t('stat.events')} />
                  <StatCell value={formatFollowers(me.followers || 0)} label={t('stat.followers')} />
                  <StatCell value={avg} label={t('stat.avg')} last />
                </>
              ) : (
                <>
                  <StatCell value={beenTotal} label={t('stat.ranked')} />
                  <StatCell value={terr.visited} label="COLONIAS" />
                  <StatCell value={stampsGot} label="GUIDE STAMPS" />
                  <StatCell value={avg} label={t('stat.avg')} last />
                </>
              )}
            </View>
          </View>
        </View>

        {/* critic's desk — only verified critics can host events */}
        {critic ? (
          <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 15, gap: 11 }}>
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                Critic’s desk
              </Banner>
              <Serif s={13.5} c={C.inkDeep} style={{ lineHeight: 19 }}>
                You’re verified on the <Serif s={13.5} c={C.ink400}>{me.beat || 'CDMX dining'}</Serif> beat. Host curated events at any restaurant — they publish to the community calendar with your critic seal.
              </Serif>
              <StickerPressable offset="sm" radius={999} onPress={hostEvent} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink700, paddingVertical: 13 }}>
                <PlusIcon size={15} color={C.sun400} sw={2.6} />
                <Banner s={12} tk={0.1} c={C.paper0}>
                  Host an event
                </Banner>
              </StickerPressable>
              <Mono s={9.5} c={C.inkSoft}>
                {eventsHosted === 0 ? 'No events yet — host your first.' : `${eventsHosted} event${eventsHosted > 1 ? 's' : ''} hosted · your reviews now carry a Critic seal`}
              </Mono>
            </StickerView>
          </View>
        ) : null}

        {/* the booklet: index tabs + the open page */}
        <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 4 }}>
            {PAGES.map((pg, i) => {
              const on = page === pg.key;
              return (
                <Pressable
                  key={pg.key}
                  onPress={() => setPage(pg.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={pg.label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingTop: on ? 9 : 7,
                    paddingBottom: on ? 9 : 6,
                    marginTop: on ? 0 : 4,
                    backgroundColor: on ? C.sun50 : C.paper100,
                    borderWidth: 2,
                    borderBottomWidth: on ? 0 : 2,
                    borderColor: C.inkBlack,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    marginBottom: on ? -2 : 0,
                    zIndex: on ? 2 : 1,
                  }}
                >
                  <Mono s={7} c={on ? C.ink400 : C.inkSoft} style={{ marginBottom: 3 }}>
                    p.{i + 1}
                  </Mono>
                  <Banner s={9.5} tk={0.08} c={on ? C.inkDeep : C.inkMuted}>
                    {pg.label}
                  </Banner>
                </Pressable>
              );
            })}
          </View>
          <View onLayout={(e) => setPageW(e.nativeEvent.layout.width - 28)} style={{ backgroundColor: C.sun50, borderWidth: 2, borderColor: C.inkBlack, padding: 14, zIndex: 1 }}>
            {page === 'menu' ? (
              <MenuPage courses={courses} firstName={me.name.split(' ')[0]} cityName={homeCity.name} next={next} bio={me.bio} canEdit={!!profile} archBlurb={archBlurb} />
            ) : page === 'territory' ? (
              <TerritoryPage tiles={terr.tiles} visited={terr.visited} elsewhere={terr.elsewhere} width={pageW} />
            ) : page === 'album' ? (
              <AlbumPage sets={album} />
            ) : (
              <PalatePage palate={palate} avg={avg} chase={chase} />
            )}
          </View>
        </View>

        {/* become a critic — signed-in nomads only */}
        {profile && !critic ? (
          <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
              {t('you.criticAccess')}
            </Banner>
            <BecomeCriticCard onVerify={becomeCritic} />
          </View>
        ) : null}

        {/* language */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            {t('you.language')}
          </Banner>
          <LangPicker showLabels size={44} />
        </View>

        {/* account */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16, paddingBottom: 34 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            {t('you.account')}
          </Banner>
          <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Banner s={11} tk={0.06} c={C.inkDeep}>
                {me.handle}
              </Banner>
              <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
                {profile && me.email
                  ? `${t('you.googleAccount')} · ${me.email}`
                  : critic
                  ? 'Verified Critic · this device'
                  : profile
                  ? 'Local account · this device'
                  : 'Guest · demo identity'}
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
      </ScrollView>
    </ScreenIn>
  );
}
