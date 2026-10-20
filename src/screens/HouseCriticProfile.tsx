/**
 * House critic profile — laid out like every critic's (header, how it's made,
 * connected accounts, palate, takes), for a real person whose list is their
 * own (data/houseCritics.ts). Their takes are a serialized ranking by category
 * (data/houseRanking.ts): their preference — their own score when they've given
 * one, else read from their own words and choices — weighed with how each place
 * ranks overall, marked HOUSE where other critics carry SIM. Their whole map
 * and written recommendations follow. If the viewer *is* that critic, their own
 * passport feeds the ranking and they can bring their Beli list in.
 */
import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { fetchLiveList, mapByCity, mapEntries, mapTitle, placeOf, type HouseCritic, type HouseEntry } from '../data/houseCritics';
import { HOUSE_CATEGORIES, houseAvg, rankedIn, type HouseCategory, type HouseTake } from '../data/houseRanking';
import { computePalate, tasteMatch, PALATE_AXES } from '../data/palate';
import { useT } from '../i18n';
import { PalateRadar } from '../components/PalateRadar';
import { HouseTag, VerdictStamp, VERDICT_COLOR } from '../components/CriticMarks';
import { CriticPassportScreen, ProfileSwitch, issuedOn, type CriticPassportSubject } from './CriticPassport';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

const norm = (h?: string | null) => (h || '').trim().toLowerCase().replace(/^@/, '');
const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^heroica /, '');

/** One place on their map: name, colonia · city, their note; opens its page. */
function MapRow({ e, c }: { e: HouseEntry; c: HouseCritic }) {
  const openPlace = useStore((s) => s.openPlace);
  const place = placeOf(e, c);
  const body = (
    <>
      <Monogram name={e.name} size={32} rot={(e.name.length % 2 ? -1 : 1) * 4 + 'deg'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Serif s={14} c={C.inkDeep} numberOfLines={1}>
          {e.name}
        </Serif>
        <Mono s={8} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
          {[e.hood, e.city && !/ciudad de m[eé]xico/i.test(e.city) ? e.city : '', e.instagram].filter(Boolean).join(' · ') || e.kind || ''}
        </Mono>
        {e.note ? (
          <Serif s={11} c={C.inkSoft} numberOfLines={2} style={{ marginTop: 3, lineHeight: 15, fontStyle: 'italic' }}>
            “{e.note}”
          </Serif>
        ) : null}
      </View>
      {place ? (
        <Display s={14} c={C.inkSoft}>
          →
        </Display>
      ) : null}
    </>
  );
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: C.paper0,
    borderWidth: 2,
    borderColor: C.inkBlack,
  };
  return place ? (
    <Pressable onPress={() => openPlace(place.id)} accessibilityLabel={`${e.name}${e.hood ? ', ' + e.hood : ''}`} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

const PAGE = 40;

/** Their map, city by city (home city first), with their own notes. */
function MapSection({ c }: { c: HouseCritic }) {
  const groups = React.useMemo(() => mapByCity(c), [c]);
  const [city, setCity] = React.useState(groups[0]?.label || '');
  const [shown, setShown] = React.useState(PAGE);
  const m = c.maps?.[0];
  const g = groups.find((x) => x.label === city) || groups[0];
  if (!m || !g) return null;
  const chip = (on: boolean) => ({
    borderWidth: 2,
    borderColor: C.inkBlack,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: on ? C.inkDeep : C.paper0,
  });
  return (
    <View style={{ paddingTop: 22 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Section title="His map" n={m.count} dot={C.stampBlue} />
        <StickerView
          offset="sm"
          style={{
            backgroundColor: C.sun100,
            borderWidth: 2,
            borderColor: C.inkBlack,
            padding: 12,
            gap: 4,
            marginBottom: 12,
          }}
        >
          <Display s={17} c={C.inkDeep} style={{ lineHeight: 19 }}>
            {mapTitle(c)}
          </Display>
          <Mono s={8.5} c={C.inkMuted}>
            {[
              m.folder
                ? m.folder
                    .replace(/\s*-\s*FINAL$/i, '').replace(/\s+TBCS\b/i, '')
                    .toLowerCase()
                    .replace(/^./, (x) => x.toUpperCase())
                : '',
              `${m.count} places · ${groups.length} cities`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Mono>
          {m.url ? (
            <Pressable onPress={() => Linking.openURL(m.url)} accessibilityLabel="Open his map on Google Maps" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              <Mono s={9} c={C.ink400} style={{ textDecorationLine: 'underline' }}>
                {m.source} ↗
              </Mono>
            </Pressable>
          ) : null}
        </StickerView>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 7,
          paddingHorizontal: 16,
          paddingBottom: 10,
        }}
      >
        {groups.map((x) => (
          <Pressable
            key={x.label}
            onPress={() => {
              setCity(x.label);
              setShown(PAGE);
            }}
            accessibilityLabel={`${x.label}: ${x.entries.length} places`}
            style={chip(x.label === g.label)}
          >
            <Banner s={9} tk={0.06} c={x.label === g.label ? C.paper0 : C.inkDeep}>
              {x.label} {x.entries.length}
            </Banner>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {g.entries.slice(0, shown).map((e) => (
          <MapRow key={e.id || e.name} e={e} c={c} />
        ))}
        {g.entries.length > shown ? (
          <Pressable
            onPress={() => setShown(shown + PAGE * 2)}
            accessibilityLabel="Show more places"
            style={{
              alignItems: 'center',
              paddingVertical: 10,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: C.inkSoft,
            }}
          >
            <Banner s={9.5} tk={0.1} c={C.inkDeep}>
              Show more · {g.entries.length - shown} left in {g.label}
            </Banner>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Section({ title, n, dot }: { title: string; n?: number; dot: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 10,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {title}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {n != null ? (
        <Mono s={9} c={C.inkSoft}>
          {n}
        </Mono>
      ) : null}
    </View>
  );
}

/** One place in their ranking — the same card every critic's take uses, numbered. */
function HouseTakeCard({ t, rank }: { t: HouseTake; rank: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const col = VERDICT_COLOR[t.verdict];
  const p = t.place;
  const where = [t.entry.hood || p?.hood, t.entry.city && !/ciudad de m[eé]xico/i.test(t.entry.city) ? t.entry.city : ''].filter(Boolean).join(' · ');
  return (
    <StickerView offset={rank <= 3 ? 'lg' : 'sm'} style={{ backgroundColor: rank <= 3 ? C.sun100 : C.paper0, borderWidth: 2, borderColor: C.inkBlack }}>
      <Pressable
        onPress={() => p && openPlace(p.id)}
        accessibilityLabel={`#${rank} ${t.entry.name}, house score ${t.score.toFixed(1)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1.5, borderColor: C.ink100 }}
      >
        <View style={{ width: 30, alignItems: 'center' }}>
          <Display s={rank < 10 ? 20 : 16} c={rank <= 3 ? C.ink400 : C.inkSoft}>
            {rank}
          </Display>
        </View>
        <Monogram name={t.entry.name} size={36} rot={rank % 2 ? '-4deg' : '3deg'} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Serif s={14} c={C.inkDeep} numberOfLines={1}>
            {t.entry.name}
          </Serif>
          <Mono s={8} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
            {where || 'Mexico'}
          </Mono>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: col.bg, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={14} c={col.fg}>
              {t.score.toFixed(1)}
            </Display>
          </View>
          <HouseTag />
        </View>
      </Pressable>
      <View style={{ padding: 10, gap: 7 }}>
        <VerdictStamp v={t.verdict} small />
        {t.quote ? (
          <Serif s={12.5} c={C.inkDeep} style={{ lineHeight: 17, fontStyle: 'italic' }} numberOfLines={4}>
            {t.entry.note ? `“${t.quote}”` : t.quote}
          </Serif>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Mono s={8} c={C.inkDeep}>
            {t.own ? 'His score' : 'His preference'} {t.pref.toFixed(1)}
          </Mono>
          <Mono s={8} c={C.inkSoft}>
            ·
          </Mono>
          <Mono s={8} c={C.inkDeep}>
            Overall {t.overall.toFixed(1)}
          </Mono>
          {t.why.length ? (
            <Mono s={8} c={C.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>
              · {t.why.join(', ')}
            </Mono>
          ) : null}
        </View>
      </View>
    </StickerView>
  );
}

const RANK_PAGE = 10;

/** Their serialized ranking: one category at a time (or overall), CDMX or all of Mexico. */
function RankingSection({ c }: { c: HouseCritic }) {
  const [scope, setScope] = React.useState<'cdmx' | 'mx'>('cdmx');
  const [cat, setCat] = React.useState<HouseCategory | 'all'>('all');
  const [shown, setShown] = React.useState(RANK_PAGE);
  const cats: { id: HouseCategory | 'all'; label: string; blurb: string }[] = [{ id: 'all', label: 'Overall', blurb: 'Every place, one list' }, ...HOUSE_CATEGORIES];
  const counts = Object.fromEntries(cats.map((x) => [x.id, rankedIn(c, x.id, scope).length]));
  const list = rankedIn(c, cat, scope);
  const chip = (on: boolean) => ({ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: on ? C.ink400 : C.paper0 });
  return (
    <View style={{ paddingTop: 22 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
          <Banner s={10} tk={0.16} c={C.inkMuted}>
            His ranking
          </Banner>
          <HouseTag />
          <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
          <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden' }}>
            {(['cdmx', 'mx'] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => {
                  setScope(k);
                  setShown(RANK_PAGE);
                }}
                accessibilityLabel={k === 'cdmx' ? 'Rank in CDMX' : 'Rank across Mexico'}
                style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: scope === k ? C.inkDeep : C.paper0 }}
              >
                <Banner s={8.5} tk={0.08} c={scope === k ? C.paper0 : C.inkDeep}>
                  {k === 'cdmx' ? 'CDMX' : 'México'}
                </Banner>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {cats
          .filter((x) => counts[x.id])
          .map((x) => (
            <Pressable
              key={x.id}
              onPress={() => {
                setCat(x.id);
                setShown(RANK_PAGE);
              }}
              accessibilityLabel={`Ranking: ${x.label}`}
              style={chip(cat === x.id)}
            >
              <Banner s={9.5} tk={0.08} c={cat === x.id ? C.paper0 : C.inkDeep}>
                {x.label} {counts[x.id]}
              </Banner>
            </Pressable>
          ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <SerifItalic s={12.5} c={C.inkMuted}>
          {cats.find((x) => x.id === cat)?.blurb} — {scope === 'cdmx' ? 'Mexico City' : 'all of Mexico'}, his #1 to #{list.length}.
        </SerifItalic>
        {list.slice(0, shown).map((t, i) => (
          <HouseTakeCard key={t.entry.id || t.entry.name} t={t} rank={i + 1} />
        ))}
        {list.length > shown ? (
          <Pressable onPress={() => setShown(shown + RANK_PAGE * 2)} accessibilityLabel="Show more of his ranking" style={{ alignItems: 'center', paddingVertical: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft }}>
            <Banner s={9.5} tk={0.1} c={C.inkDeep}>
              Show #{shown + 1}–#{Math.min(list.length, shown + RANK_PAGE * 2)} of {list.length}
            </Banner>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const ACCOUNT_EVIDENCE: Record<string, string> = {
  Beli: 'His Beli profile — scores join his ranking as he shares them',
  'World of Mouth': 'His World of Mouth profile',
  'Google My Maps': 'His public map — the places below',
};

export function HouseCriticProfile({ c }: { c: HouseCritic }) {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeCritic);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const openImport = useStore((s) => s.openImport);
  const profile = useStore((s) => s.profile);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const t = useT();
  const [live, setLive] = React.useState<HouseEntry[] | null>(null);
  const [photoOk, setPhotoOk] = React.useState(!!c.photo);
  const [mode, setMode] = React.useState<'profile' | 'passport'>('profile');

  React.useEffect(() => {
    let on = true;
    fetchLiveList(c).then((l) => on && l && l.length && setLive(l));
    return () => {
      on = false;
    };
  }, [c.id]);

  const isMe = !!profile && norm(profile.handle) === norm(c.handle);
  // Their scores — from their passport (live, or this device when it's them) — join the ranking.
  const scored: HouseEntry[] = isMe ? ranked.filter((p) => p.score != null).map((p) => ({ placeId: p.id, name: p.name, hood: p.hood, score: p.score, list: 'been' as const })) : live || [];
  const critic = React.useMemo<HouseCritic>(() => {
    if (!scored.length) return c;
    const own = new Set(scored.map((e) => e.placeId));
    return { ...c, list: [...scored, ...c.list.filter((e) => !(e.placeId && own.has(e.placeId)))] };
  }, [c, live, isMe && ranked]);

  const all = rankedIn(critic, 'all', 'mx');
  const cdmxTop = rankedIn(critic, 'all', 'cdmx')[0];
  const onMap = mapEntries(critic);
  const recs = critic.list.filter((e) => e.list === 'rec');
  const words = critic.list.filter((e) => (e.note || '').replace(/[.\s]/g, '')).length;
  const cities = new Set(all.map((x) => fold(x.entry.city || 'cdmx'))).size;
  const following = !!follows['critic:' + c.id];
  const counts = all.reduce<Record<string, number>>((m, x) => ((m[x.verdict] = (m[x.verdict] || 0) + 1), m), {});
  const summary = `${all.length} places across ${cities} ${cities === 1 ? 'city' : 'cities'} — ${counts.rave || 0} raves, ${counts.recommends || 0} recommends${cdmxTop ? `; his #1 in CDMX is ${cdmxTop.entry.name}` : ''}.`;

  // Palate, like every critic's: the places he ranks, weighted by his house score.
  const places = all.filter((x) => x.place).map((x) => ({ ...x.place!, score: x.score }));
  const palate = computePalate(places);
  const mine = computePalate(ranked, tastes, userReviews);
  const match = tasteMatch(mine, palate);
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));

  const accounts = [
    ...c.links.map((l) => ({ platform: l.platform, label: l.platform === 'Beli' || l.platform === 'World of Mouth' ? c.handle : l.url, url: l.url })),
    ...(c.maps?.[0]?.url ? [{ platform: 'Google My Maps', label: mapTitle(c), url: c.maps[0].url }] : []),
  ];
  if (mode === 'passport') {
    const passport: CriticPassportSubject = {
      id: c.id,
      name: c.name,
      handle: c.handle,
      photo: c.photo,
      house: true,
      beat: 'Specialty coffee · México',
      signature: c.bio || summary,
      places,
      avg: houseAvg(critic),
      joined: issuedOn(c.asOf) || 'CRTQ',
    };
    return <CriticPassportScreen s={passport} onBack={close} onProfile={() => setMode('profile')} top={insets.top} bottom={insets.bottom} />;
  }

  const stats: [string, string][] = [
    [String(all.length), 'places ranked'],
    [String(words), 'in his words'],
    [houseAvg(critic).toFixed(1), 'house avg'],
  ];

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <Pressable onPress={close} accessibilityLabel="Back" style={{ paddingRight: 4, paddingVertical: 4 }}>
              <Display s={20} c={C.ink400}>
                ←
              </Display>
            </Pressable>
            <Banner s={10} tk={0.16} c={C.inkMuted} numberOfLines={1} style={{ flex: 1 }}>
              House critic · critic profile
            </Banner>
            <ProfileSwitch mode="profile" onChange={setMode} />
          </View>

          {/* header — same as every critic's, with the house badge */}
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ position: 'absolute', top: 12, right: 12, transform: [{ rotate: '6deg' }], backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={8} tk={0.14} c={C.paper0}>
                House critic
              </Banner>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                {photoOk && c.photo ? (
                  <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
                    <Image source={{ uri: c.photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setPhotoOk(false)} accessibilityLabel={c.name} />
                  </View>
                ) : (
                  <Monogram name={c.name} size={60} fg={C.paper0} />
                )}
              </StickerView>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 64 }}>
                <Display s={21} c={C.paper0} style={{ lineHeight: 23 }} numberOfLines={2}>
                  {c.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }} numberOfLines={1}>
                  {[c.handle, 'CDMX'].join(' · ')}
                </Mono>
              </View>
            </View>
            {c.bio ? (
              <Serif s={12.5} c={C.paper0} style={{ marginTop: 12, lineHeight: 18 }}>
                {c.bio}
              </Serif>
            ) : null}
            <SerifItalic s={12} c={C.sun200} style={{ marginTop: c.bio ? 6 : 12, lineHeight: 17 }}>
              {summary}
            </SerifItalic>
            <View style={{ flexDirection: 'row', marginTop: 14, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 12 }}>
              {stats.map(([n, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Display s={20} c={C.paper0}>
                    {n}
                  </Display>
                  <Mono s={8} c={C.ink100}>
                    {l}
                  </Mono>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 14 }}>
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => toggleFollow('critic:' + c.id)}
                accessibilityLabel={following ? `Following ${c.name}` : `Follow ${c.name}`}
                style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.sun400, paddingVertical: 10 }}
              >
                <Banner s={10} tk={0.1} c={following ? C.paper0 : C.inkDeep}>
                  {following ? 'Following on CRTQ' : 'Follow on CRTQ'}
                </Banner>
              </StickerPressable>
            </View>
          </StickerView>
        </View>

        {/* what "house" means */}
        <View style={{ marginTop: 14, marginHorizontal: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft, padding: 11, gap: 4 }}>
          <Banner s={8.5} tk={0.14} c={C.inkDeep}>
            How this profile is made
          </Banner>
          <Serif s={11.5} c={C.inkMuted} style={{ lineHeight: 16 }}>
            {c.name} is a CRTQ house critic: the places are his own — his map, his notes, his lists. His ranking (<Mono s={9} c={C.stampGreen}>HOUSE</Mono>) weighs his preference
            (60%) with how each place ranks overall (40%: the guide’s acclaim and the critics’ consensus). His preference is his own score where he’s given one (Beli, or his CRTQ
            passport as {c.handle}); elsewhere CRTQ reads it from his choices and his own words. Quotes are his, as written.
          </Serif>
        </View>

        {/* connected accounts */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampBlue }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              Connected accounts
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            <Mono s={9} c={C.inkSoft}>
              {accounts.length}
            </Mono>
          </View>
          {accounts.map((a) => (
            <Pressable
              key={a.url}
              onPress={() => Linking.openURL(a.url)}
              accessibilityLabel={`${a.platform}: ${a.label}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 11, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack }}
            >
              <View style={{ minWidth: 76, backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, alignItems: 'center' }}>
                <Banner s={8} tk={0.08} c={C.paper0} numberOfLines={1}>
                  {a.platform}
                </Banner>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Mono s={10.5} c={C.inkDeep} numberOfLines={1}>
                  {a.label}
                </Mono>
                <Mono s={7.5} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
                  ✓ {ACCOUNT_EVIDENCE[a.platform] || 'Linked by him'}
                </Mono>
              </View>
              <Display s={14} c={C.inkSoft}>
                ↗
              </Display>
            </Pressable>
          ))}
        </View>

        {/* palate */}
        {places.length ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sun500 }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                His palate
              </Banner>
              <HouseTag />
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            </View>
            <StickerView offset="sm" style={{ backgroundColor: C.sun100, borderWidth: 2, borderColor: C.inkBlack, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PalateRadar axes={palate.axes} labels={axisLabels} size={118} showLabels={false} fill={C.stampGreen} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Display s={16} c={C.inkDeep} style={{ lineHeight: 18 }}>
                  {t('arch.' + palate.archId + '.t')}
                </Display>
                <Mono s={8.5} c={C.inkMuted} numberOfLines={2}>
                  {HOUSE_CATEGORIES.filter((x) => rankedIn(critic, x.id, 'mx').length)
                    .sort((a, b) => rankedIn(critic, b.id, 'mx').length - rankedIn(critic, a.id, 'mx').length)
                    .map((x) => x.label)
                    .slice(0, 3)
                    .join(' · ')}
                </Mono>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Banner s={9} tk={0.06} c={C.sun300}>
                      {match}% match
                    </Banner>
                  </View>
                  <Mono s={8} c={C.inkSoft}>
                    with your palate
                  </Mono>
                </View>
              </View>
            </StickerView>
          </View>
        ) : null}

        {/* his takes: the serialized ranking by category */}
        {all.length ? <RankingSection c={critic} /> : null}

        {recs.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <Section title="His recommendations" n={recs.length} dot={C.ink400} />
            <Mono s={8.5} c={C.inkSoft} style={{ marginBottom: 8 }}>
              In his words, from {[...new Set(recs.map((e) => e.source).filter(Boolean))].join(' · ') || 'his recommendations'}
            </Mono>
            <View style={{ gap: 8 }}>
              {recs.map((e) => (
                <MapRow key={e.id || e.name} e={e} c={critic} />
              ))}
            </View>
          </View>
        ) : null}

        {onMap.length ? <MapSection c={critic} /> : null}

        {isMe && !critic.list.some((e) => e.score != null) ? (
          <View style={{ paddingTop: 18, paddingHorizontal: 16, gap: 8 }}>
            <Mono s={8.5} c={C.inkSoft} style={{ lineHeight: 13 }}>
              Your own {c.source} scores replace the read-from-your-words preference in your ranking.
            </Mono>
            <StickerPressable
              offset="sm"
              radius={999}
              onPress={() => openImport('beli')}
              accessibilityLabel="Import my Beli list"
              style={{ alignSelf: 'flex-start', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.inkDeep, paddingVertical: 9, paddingHorizontal: 16 }}
            >
              <Banner s={10} tk={0.1} c={C.paper0}>
                Import my Beli list →
              </Banner>
            </StickerPressable>
          </View>
        ) : null}
      </ScrollView>
    </ScreenIn>
  );
}
