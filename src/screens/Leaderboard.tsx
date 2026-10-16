/**
 * Leaderboard — three boards behind a toggle:
 *   Restaurants — the city's places ranked by an overall Critics+People score,
 *                 filterable by cuisine.
 *   Critics     — the real creators and food media connected from their clips
 *                 (data/critics.ts), ranked by coverage, simulated average or
 *                 palate match with you; opens their critic profile.
 *   Diners      — friends ranked by places eaten this year (podium + follow).
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { FRIENDS, byId, type Place } from '../store/data';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { identity } from '../data/profile';
import { computePalate, friendPalate, tasteMatch } from '../data/palate';
import { CRITICS, type Critic } from '../data/critics';
import { SOURCE_LABEL } from '../data/videos';
import { SimTag } from '../components/CriticMarks';
import { Monogram } from '../components/Monogram';
import { C, col } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Segmented } from '../components/Segmented';
import { Photo } from '../components/Photo';
import { Roundel } from '../components/Roundel';
import { ScreenIn } from '../components/Anim';

const MEDALS = ['①', '②', '③'];

let lastMode = 'places';

const SCORED: (Place & { overall: number })[] = Object.values(byId)
  .filter((p) => p.critic != null && p.people != null)
  .map((p) => ({ ...p, overall: Math.round(((p.critic! + p.people!) / 2) * 10) / 10 }));

function DinersBoard() {
  const insets = useSafeAreaInsets();
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const profile = useStore((s) => s.profile);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const openFoodie = useStore((s) => s.openFoodie);
  const t = useT();
  const idn = identity(profile);

  // My palate → taste-match against each friend.
  const myPalate = computePalate(ranked, tastes, userReviews);
  const matchOf = (id: string) => tasteMatch(myPalate, friendPalate({ id }));

  const me = { id: 'me', name: `You · ${idn.name.split(' ')[0]}`, initials: idn.initials, color: idn.color, year: 41, match: 'your log', isMe: true };
  const all = [...FRIENDS, me].slice().sort((a, b) => b.year - a.year);
  const podium = all.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 18 }}>
        {podium.map((p, i) => {
          const size = i === 0 ? 68 : 56;
          const rot = i === 0 ? '-5deg' : i === 1 ? '4deg' : '-3deg';
          const isMe = 'isMe' in p && (p as any).isMe;
          return (
            <Pressable key={p.id} onPress={() => (isMe ? undefined : openFoodie(p.id))} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: rot }] }}>
                <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col(p.color), borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  <Banner s={14} c={C.paper0}>
                    {p.initials}
                  </Banner>
                </View>
              </StickerView>
              <Display s={15} c={C.ink400}>
                {MEDALS[i]}
              </Display>
              <Banner s={9} tk={0.06} c={C.inkDeep} style={{ textAlign: 'center', lineHeight: 11 }}>
                {p.name.replace('You · ', '')}
              </Banner>
              <Mono s={9} c={C.inkMuted}>
                {isMe ? `${p.year} places` : `${matchOf(p.id)}% ${t('foodie.matchShort')}`}
              </Mono>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 9 }}>
        {all.map((p, i) => {
          const isMe = 'isMe' in p && p.isMe;
          const following = isMe ? false : !!follows[p.id];
          return (
            <StickerView key={p.id} offset={isMe ? 'lg' : 'sm'} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: isMe ? C.sun100 : C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 12 }}>
              <View style={{ width: 26, alignItems: 'center' }}>
                <Display s={16} c={isMe ? C.sun600 : C.ink400}>
                  {i + 1}
                </Display>
              </View>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: col(p.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Banner s={11} c={C.paper0}>
                  {p.initials}
                </Banner>
              </View>
              <Pressable disabled={isMe} onPress={() => openFoodie(p.id)} style={{ flex: 1, minWidth: 0 }}>
                <Banner s={12} tk={0.04} c={C.inkDeep} numberOfLines={1}>
                  {p.name}
                </Banner>
                <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                  {p.year} this year · {isMe ? 'your log' : `${matchOf(p.id)}% ${t('foodie.matchShort')}`}
                </Mono>
              </Pressable>
              {isMe ? (
                <View style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 6, paddingHorizontal: 11 }}>
                  <Banner s={9} tk={0.1} c={C.inkDeep}>
                    You
                  </Banner>
                </View>
              ) : (
                <StickerPressable offset="sm" radius={999} onPress={() => toggleFollow(p.id)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.paper0, paddingVertical: 6, paddingHorizontal: 11 }}>
                  <Banner s={9} tk={0.1} c={following ? C.greenFg : C.inkDeep}>
                    {following ? 'Following' : 'Follow'}
                  </Banner>
                </StickerPressable>
              )}
            </StickerView>
          );
        })}
      </View>
    </ScrollView>
  );
}

function RestaurantsBoard() {
  const insets = useSafeAreaInsets();
  const openPlace = useStore((s) => s.openPlace);
  const [cuisine, setCuisine] = useState('All');

  const cuisines = ['All', ...Array.from(new Set(SCORED.map((p) => p.cuisine)))];
  const ranked = SCORED.filter((p) => cuisine === 'All' || p.cuisine === cuisine).sort((a, b) => b.overall - a.overall);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {cuisines.map((c) => {
            const on = cuisine === c;
            return (
              <Pressable key={c} onPress={() => setCuisine(c)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13, backgroundColor: on ? C.ink400 : C.paper0 }}>
                <Banner s={10} tk={0.1} c={on ? C.paper0 : C.inkDeep}>
                  {c}
                </Banner>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 100, gap: 10 }} showsVerticalScrollIndicator={false}>
        <SerifItalic s={13} c={C.inkMuted} style={{ paddingHorizontal: 2 }}>
          {cuisine === 'All' ? 'The whole city, by the blended verdict.' : `Best ${cuisine.toLowerCase()} in the city.`}
        </SerifItalic>
        {ranked.map((p, i) => {
          const st = scoreStyle(p.overall);
          return (
            <StickerPressable key={p.id} offset="sm" onPress={() => openPlace(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 11 }}>
              <View style={{ width: 26, alignItems: 'center' }}>
                <Display s={18} c={i < 3 ? C.ink400 : C.inkSoft}>
                  {i + 1}
                </Display>
              </View>
              <Photo source={photo(p.photo)} style={{ width: 52, height: 52, borderWidth: 2, borderColor: C.inkBlack }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <SerifDisplay s={15.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
                  {p.name}
                </SerifDisplay>
                <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
                  {metaOf(p)}
                </Mono>
                <Mono s={9} c={C.inkSoft} style={{ marginTop: 2 }}>
                  Critics {fmt(p.critic!)} · People {fmt(p.people!)}
                </Mono>
              </View>
              <Roundel size={44} bg={st.bg} fg={st.fg} text={fmt(p.overall)} textSize={15} rot="-5deg" />
            </StickerPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type CriticSort = 'coverage' | 'avg' | 'match';
type CriticKind = 'all' | 'creator' | 'outlet';

function CriticsBoard() {
  const insets = useSafeAreaInsets();
  const openCritic = useStore((s) => s.openCritic);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const [kind, setKind] = useState<CriticKind>('all');
  const [sort, setSort] = useState<CriticSort>('coverage');

  const mine = computePalate(ranked, tastes, userReviews);
  const match: Record<string, number> = {};
  CRITICS.forEach((c) => (match[c.id] = tasteMatch(mine, c.palate)));
  const by: Record<CriticSort, (a: Critic, b: Critic) => number> = {
    coverage: (a, b) => b.takes.length - a.takes.length || b.clipCount - a.clipCount || b.avg - a.avg,
    avg: (a, b) => b.avg - a.avg || b.takes.length - a.takes.length,
    match: (a, b) => match[b.id] - match[a.id] || b.takes.length - a.takes.length,
  };
  const list = CRITICS.filter((c) => kind === 'all' || c.kind === kind).sort(by[sort]);
  const chip = (on: boolean) => ({ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: on ? C.ink400 : C.paper0 });
  const KINDS: [CriticKind, string][] = [['all', 'All'], ['creator', 'Creators'], ['outlet', 'Food media']];
  const SORTS: [CriticSort, string][] = [['coverage', 'Most covered'], ['avg', 'Highest SIM'], ['match', 'Your match']];
  const caption = {
    coverage: 'Ranked by how many guide restaurants they have on camera.',
    avg: 'Ranked by the average of CRTQ’s simulated reading of their takes.',
    match: 'Ranked by how closely their palate matches yours.',
  }[sort];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          {KINDS.map(([k, label]) => (
            <Pressable key={k} onPress={() => setKind(k)} accessibilityLabel={`Show ${label}`} style={chip(kind === k)}>
              <Banner s={10} tk={0.1} c={kind === k ? C.paper0 : C.inkDeep}>
                {label}
              </Banner>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' }}>
          <Mono s={8.5} c={C.inkSoft}>
            Sort
          </Mono>
          {SORTS.map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setSort(k)}
              accessibilityLabel={`Sort critics: ${label}`}
              style={{ borderBottomWidth: 2, borderColor: sort === k ? C.ink400 : 'transparent', paddingVertical: 3, paddingHorizontal: 4 }}
            >
              <Banner s={9} tk={0.08} c={sort === k ? C.ink400 : C.inkSoft}>
                {label}
              </Banner>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 100, gap: 10 }} showsVerticalScrollIndicator={false}>
        <SerifItalic s={13} c={C.inkMuted} style={{ paddingHorizontal: 2 }}>
          {caption}
        </SerifItalic>
        {list.map((c, i) => {
          const following = !!follows['critic:' + c.id];
          return (
            <StickerPressable
              key={c.id}
              offset={i < 3 ? 'lg' : 'sm'}
              onPress={() => openCritic(c.id)}
              accessibilityLabel={`Critic: ${c.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: i < 3 ? C.sun100 : C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 11 }}
            >
              <View style={{ width: 26, alignItems: 'center' }}>
                <Display s={i < 3 ? 17 : 16} c={i < 3 ? C.ink400 : C.inkSoft}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </Display>
              </View>
              <Monogram name={c.name} size={40} rot={i % 2 ? '4deg' : '-4deg'} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Banner s={11.5} tk={0.04} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {c.name}
                  </Banner>
                  <View style={{ backgroundColor: c.kind === 'outlet' ? C.inkBlack : C.ink400, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Mono s={7} c={C.paper0}>
                      {c.kind === 'outlet' ? 'MEDIA' : 'CREATOR'}
                    </Mono>
                  </View>
                </View>
                <Mono s={8.5} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
                  {[c.handle, c.platforms.map((p) => SOURCE_LABEL[p]).join(' · ')].join(' · ')}
                </Mono>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2, marginTop: 4 }}>
                  <Mono s={8.5} c={sort === 'coverage' ? C.ink400 : C.inkSoft}>
                    {c.takes.length} {c.takes.length === 1 ? 'place' : 'places'}
                  </Mono>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Mono s={8.5} c={sort === 'avg' ? C.ink400 : C.inkSoft}>
                      avg {c.avg.toFixed(1)}
                    </Mono>
                    <SimTag />
                  </View>
                  <Mono s={8.5} c={sort === 'match' ? C.ink400 : C.inkSoft}>
                    {match[c.id]}% match
                  </Mono>
                </View>
              </View>
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => toggleFollow('critic:' + c.id)}
                accessibilityLabel={following ? `Following ${c.name}` : `Follow ${c.name}`}
                style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.paper0, paddingVertical: 6, paddingHorizontal: 10 }}
              >
                <Banner s={8.5} tk={0.1} c={following ? C.greenFg : C.inkDeep}>
                  {following ? 'Following' : 'Follow'}
                </Banner>
              </StickerPressable>
            </StickerPressable>
          );
        })}
        <Mono s={8} c={C.inkSoft} style={{ marginTop: 4, lineHeight: 12, paddingHorizontal: 2 }}>
          Real creators and food media, connected from their public clips. Averages and matches come from CRTQ’s simulated reading of their content, not ratings they gave.
        </Mono>
      </ScrollView>
    </View>
  );
}

export function Leaderboard() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  // Remembered across visits, so Back from a critic / restaurant lands on the same board.
  const [mode, setModeState] = useState(lastMode);
  const setMode = (m: string) => {
    lastMode = m;
    setModeState(m);
  };
  const t = useT();

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 4, borderBottomWidth: mode === 'diners' ? 2.5 : 0, borderBottomColor: C.inkBlack }}>
        <Pressable onPress={() => go('feed')} style={{ paddingBottom: 8 }}>
          <Banner s={11} tk={0.14} c={C.ink400}>
            ← CRTQ
          </Banner>
        </Pressable>
        <Display s={30} c={C.inkDeep}>
          {t('board.title')}
        </Display>
        <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 3 }}>
          {mode === 'places' ? "The city's tables, ranked." : mode === 'critics' ? 'The creators who film the city, ranked.' : "Who's eaten the city this year."}
        </SerifItalic>
        <View style={{ marginTop: 12 }}>
          <Segmented
            items={[
              { key: 'places', label: t('board.restaurants') },
              { key: 'critics', label: t('board.critics') },
              { key: 'diners', label: t('board.diners') },
            ]}
            value={mode}
            onChange={setMode}
            activeFg={C.inkDeep}
            inactiveFg={C.inkSoft}
            activeBorder={C.ink400}
          />
        </View>
      </View>
      {mode === 'places' ? <RestaurantsBoard /> : mode === 'critics' ? <CriticsBoard /> : <DinersBoard />}
    </ScreenIn>
  );
}
