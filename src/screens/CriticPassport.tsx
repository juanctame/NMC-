/**
 * A critic's passport — the same booklet every CRTQ passport is (Passport.tsx),
 * issued to each critic as a press passport (type D), read-only: cover, data
 * page (holder, beat, accreditation, their Top 4, record, signature, MRZ),
 * visas, entry stamps for the colonias they've covered, and their palate print.
 *
 * Built from what's on their profile: a creator's or outlet's takes (CRTQ's
 * SIM reading, and the passport says so), or a house critic's own ranking
 * (HOUSE, on a green house-critic cover).
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useT } from '../i18n';
import { C, col } from '../theme/tokens';
import type { Place } from '../store/data';
import { categoryOf, type TopFour } from '../data/favorites';
import { computePalate } from '../data/palate';
import { AVATAR_COLORS, initialsOf } from '../data/profile';
import { territory, guideAlbum, mrzLines, hashOf } from '../data/youProfile';
import { TopFourGrid } from '../components/TopFour';
import { PapelPicado } from '../components/PapelPicado';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Display, Banner, Mono, SerifItalic } from '../components/Text';
import { SimTag, HouseTag } from '../components/CriticMarks';
import { BioPage, BookletBase, Chevron, CoverPage, FieldLabel, PassportPage, StampsPage, Table, TurnPage, VisasPage, useBookletPager } from './Passport';

export type CriticPassportSubject = {
  id: string;
  name: string;
  handle: string;
  photo?: string;
  house: boolean; // a house critic (their own list) vs a creator / outlet (CRTQ's SIM reading)
  beat: string;
  signature: string; // their bio, else their summary
  places: Place[]; // the places they cover, scored (house score / SIM)
  avg: number;
  joined: string; // "JUL 2026"
};

const PAGES = [
  { key: 'cover', name: 'Cover', title: '', sub: '', no: '' },
  { key: 'data', name: 'Data page', title: '', sub: '', no: '1', wash: C.sun200 },
  { key: 'visas', name: 'Visas', title: 'VISAS', sub: 'Guide collections they cover', no: '2', wash: C.sun200 },
  { key: 'stamps', name: 'Sellos', title: 'SELLOS', sub: 'Entry stamps · colonias crossed', no: '3', wash: C.ink100 },
  { key: 'bio', name: 'Biometría', title: 'BIOMETRÍA', sub: 'Palate print', no: '4', wash: C.sun200 },
] as const;

export function CriticPassport({ s }: { s: CriticPassportSubject }) {
  const t = useT();
  const [area, setArea] = useState({ w: 0, h: 0 });
  const { idx, pos, goTo, pan } = useBookletPager(PAGES.length, area.w, 0);

  const ranked = useMemo(() => s.places.slice().sort((a, b) => (b.score || 0) - (a.score || 0)), [s.places]);
  const palate = useMemo(() => computePalate(ranked), [ranked]);
  const terr = useMemo(() => territory(ranked), [ranked]);
  const album = useMemo(() => guideAlbum(ranked), [ranked]);
  const visas = useMemo(() => new Set(album.flatMap((x) => x.got.map((p) => p.id))).size, [album]);
  const passportNo = 100000 + (hashOf(s.id) % 900000);
  const no = String(passportNo).padStart(6, '0');
  const avg = s.avg.toFixed(1);
  const archTitle = t('arch.' + palate.archId + '.t');
  const [mrz1, mrz2] = mrzLines({ type: 'D', name: s.name, passportNo, country: 'MEX', archetype: s.beat || 'PRESS', stamps: ranked.length, colonias: terr.visited, visas, avg });
  const top: TopFour = [0, 1, 2, 3].map((i) => (ranked[i] ? { placeId: ranked[i].id, category: categoryOf(ranked[i]) } : null));
  const color = AVATAR_COLORS[hashOf(s.id) % AVATAR_COLORS.length];
  // A duo or an outlet keeps its name whole; a person reads SURNAME, GIVEN.
  const parts = s.name.trim().split(/\s+/);
  const whole = parts.length === 1 || /&|\+| y | and /i.test(s.name);
  const holder = whole ? s.name : `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
  const header = s.house ? 'PASAPORTE DE LA CASA · HOUSE CRITIC' : 'PASAPORTE DE PRENSA · PRESS';
  const record = [
    { v: String(ranked.length), l: 'VEREDICTOS' },
    { v: String(terr.visited), l: 'COLONIAS' },
    { v: String(visas), l: 'VISAS' },
    { v: avg, l: 'PROMEDIO' },
  ];

  const page = (i: number, children: (w: number) => React.ReactNode, footer?: React.ReactNode) => {
    const p = PAGES[i] as { key: string; title: string; sub: string; no: string; wash: string };
    return (
      <PassportPage key={p.key} w={area.w} h={area.h} wash={p.wash} header={header} title={p.title} sub={p.sub} no={p.no} docNo={no} press footer={footer}>
        {children}
      </PassportPage>
    );
  };

  const dataPage = () => (
    <View accessibilityLabel={`${s.name}'s passport data page`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Mono s={9} c={C.inkMuted}>
          TIPO / TYPE <Mono s={9} c={C.ink500}>{s.house ? 'D · CASA' : 'D · PRENSA'}</Mono>
        </Mono>
        <View pointerEvents="none" style={{ opacity: 0.45 }}>
          <PapelPicado palate={palate} seed={s.handle || s.name} width={100} height={24} flags={5} hole={C.paper0} />
        </View>
        <Mono s={9} c={C.inkMuted}>
          CRTQ
        </Mono>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 14 }}>
        <View>
          <View style={{ width: 92, height: 118, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: col(color), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {s.photo ? (
              <Image source={{ uri: s.photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={s.name} />
            ) : (
              <Display s={32} c={C.paper0}>
                {initialsOf(s.name)}
              </Display>
            )}
            <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 2, borderColor: s.house ? C.stampGreen : C.sun400 }} />
          </View>
          <View style={{ position: 'absolute', left: 8, right: 8, bottom: -8, alignItems: 'center', backgroundColor: s.house ? C.stampGreen : C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, paddingVertical: 2, transform: [{ rotate: '-6deg' }] }}>
            <Banner s={8.5} tk={0.2} c={C.paper0}>
              {s.house ? 'HOUSE' : 'PRESS'}
            </Banner>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <View>
            <FieldLabel>TITULAR / HOLDER</FieldLabel>
            <Mono s={13.5} c={C.inkDeep} numberOfLines={1}>
              {holder.toUpperCase()}
            </Mono>
          </View>
          <View>
            <FieldLabel>FUENTE / BEAT</FieldLabel>
            <SerifItalic s={17} c={C.ink500} numberOfLines={1}>
              {s.beat}
            </SerifItalic>
          </View>
          <View>
            <FieldLabel>ACREDITACIÓN / ACCREDITED</FieldLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Mono s={11} c={s.house ? C.stampGreen : C.ink500}>
                {s.house ? '✓ HOUSE CRITIC' : 'CRITIC · CRTQ READING'}
              </Mono>
              {s.house ? <HouseTag /> : <SimTag />}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View>
              <FieldLabel>CIUDAD / HOME</FieldLabel>
              <Mono s={10.5} c={C.inkDeep}>
                CDMX
              </Mono>
            </View>
            <View>
              <FieldLabel>EXPEDICIÓN / ISSUED</FieldLabel>
              <Mono s={10.5} c={C.inkDeep}>
                {s.joined}
              </Mono>
            </View>
          </View>
        </View>
      </View>

      {/* their four best, first thing on the page */}
      <View style={{ marginTop: 20 }} accessibilityLabel={`${s.name}'s Top 4`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <FieldLabel>SUS CUATRO / TOP 4</FieldLabel>
          <View style={{ flex: 1, height: 1.5, backgroundColor: C.paper300 }} />
          {s.house ? <HouseTag /> : <SimTag />}
        </View>
        <TopFourGrid top={top} variant="row" owner={s.name} />
      </View>

      {/* the record */}
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

      {/* signature */}
      <View style={{ paddingTop: 14 }}>
        <FieldLabel>FIRMA DEL TITULAR / HOLDER'S SIGNATURE</FieldLabel>
        <View style={{ borderBottomWidth: 1.5, borderBottomColor: C.paper300, paddingBottom: 5, marginTop: 3 }}>
          <SerifItalic s={15.5} c={C.inkDeep} numberOfLines={3}>
            “{s.signature || archTitle}”
          </SerifItalic>
        </View>
      </View>
    </View>
  );

  const mrz = (
    <View accessibilityLabel={`Machine-readable zone: ${ranked.length} verdicts, ${terr.visited} colonias, ${visas} visas`} style={{ backgroundColor: C.paper100, borderTopWidth: 2, borderTopColor: C.paper300, borderStyle: 'dashed', paddingVertical: 8, paddingHorizontal: 8 }}>
      <Mono s={9.6} c={C.inkBlack} style={{ letterSpacing: 0.4, lineHeight: 15 }} numberOfLines={1}>
        {mrz1}
      </Mono>
      <Mono s={9.6} c={C.inkBlack} style={{ letterSpacing: 0.4, lineHeight: 15 }} numberOfLines={1}>
        {mrz2}
      </Mono>
    </View>
  );

  const pages: React.ReactNode[] = [
    <CoverPage key="cover" w={area.w} h={area.h} press house={s.house} city="CDMX" joined={s.joined} onOpen={() => goTo(1)} />,
    page(1, () => dataPage(), mrz),
    page(2, () => <VisasPage sets={album} pending={[]} third />),
    page(3, (w) => <StampsPage tiles={terr.tiles} visited={terr.visited} elsewhere={terr.elsewhere} ranked={ranked} width={w} third />),
    page(4, (w) => <BioPage palate={palate} avg={avg} chase={palate.topCuisines.map((c) => c.name)} seed={s.handle || s.name} width={w} third />),
  ];
  const cur = PAGES[idx] || PAGES[0];

  return (
    <View style={{ flex: 1 }}>
      <Table press city="CDMX" joined={s.joined} />
      <View style={{ flex: 1 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area.w ? <BookletBase w={area.w} h={area.h} press /> : null}
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
  );
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "2024-05-12…" → "MAY 2024" (the passport's issue date). */
export const issuedOn = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '';
};

/** Profile | Passport — the switch at the top of every critic's page. */
export function ProfileSwitch({ mode, onChange, dark }: { mode: 'profile' | 'passport'; onChange: (m: 'profile' | 'passport') => void; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden', backgroundColor: C.paper0 }}>
      {(['profile', 'passport'] as const).map((m) => (
        <Pressable key={m} onPress={() => onChange(m)} accessibilityLabel={m === 'profile' ? 'Show profile' : 'Show passport'} accessibilityState={{ selected: mode === m }} style={{ paddingVertical: 5, paddingHorizontal: 11, backgroundColor: mode === m ? (dark ? C.sun400 : C.inkDeep) : C.paper0 }}>
          <Banner s={8.5} tk={0.1} c={mode === m ? (dark ? C.inkDeep : C.paper0) : C.inkDeep}>
            {m === 'profile' ? 'Profile' : 'Passport'}
          </Banner>
        </Pressable>
      ))}
    </View>
  );
}

/** A critic's page in passport mode: back, the switch, and their booklet on the table. */
export function CriticPassportScreen({ s, onBack, onProfile, top, bottom }: { s: CriticPassportSubject; onBack: () => void; onProfile: () => void; top: number; bottom: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.inkDeep, paddingTop: top + 4, paddingBottom: Math.max(bottom, 12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6, zIndex: 2 }}>
        <Pressable onPress={onBack} accessibilityLabel="Back" style={{ paddingRight: 4, paddingVertical: 4 }}>
          <Display s={20} c={C.sun400}>
            ←
          </Display>
        </Pressable>
        <Banner s={10} tk={0.16} c={C.paper0} numberOfLines={1} style={{ flex: 1 }}>
          {s.house ? 'House critic' : 'Critic'} · passport
        </Banner>
        <ProfileSwitch mode="passport" onChange={(m) => m === 'profile' && onProfile()} dark />
      </View>
      <CriticPassport s={s} />
    </View>
  );
}
