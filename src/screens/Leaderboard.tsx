/**
 * Leaderboard — two boards behind a toggle:
 *   Diners      — friends ranked by places eaten this year (podium + follow).
 *   Restaurants — the city's places ranked by an overall Critics+People score,
 *                 filterable by cuisine.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { FRIENDS, byId, type Place } from '../store/data';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { identity } from '../data/profile';
import { C, col } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Segmented } from '../components/Segmented';
import { Photo } from '../components/Photo';
import { Roundel } from '../components/Roundel';
import { ScreenIn } from '../components/Anim';

const MEDALS = ['①', '②', '③'];

const SCORED: (Place & { overall: number })[] = Object.values(byId)
  .filter((p) => p.critic != null && p.people != null)
  .map((p) => ({ ...p, overall: Math.round(((p.critic! + p.people!) / 2) * 10) / 10 }));

function DinersBoard() {
  const insets = useSafeAreaInsets();
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const profile = useStore((s) => s.profile);
  const idn = identity(profile);

  const me = { id: 'me', name: `You · ${idn.name.split(' ')[0]}`, initials: idn.initials, color: idn.color, year: 41, match: 'your log', isMe: true };
  const all = [...FRIENDS, me].slice().sort((a, b) => b.year - a.year);
  const podium = all.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 18 }}>
        {podium.map((p, i) => {
          const size = i === 0 ? 68 : 56;
          const rot = i === 0 ? '-5deg' : i === 1 ? '4deg' : '-3deg';
          return (
            <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
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
                {p.year} places
              </Mono>
            </View>
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Banner s={12} tk={0.04} c={C.inkDeep} numberOfLines={1}>
                  {p.name}
                </Banner>
                <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                  {p.year} this year · {isMe ? 'your log' : (p as (typeof FRIENDS)[number]).match + ' taste match'}
                </Mono>
              </View>
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

export function Leaderboard() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const [mode, setMode] = useState('places');

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 4, borderBottomWidth: mode === 'places' ? 0 : 2.5, borderBottomColor: C.inkBlack }}>
        <Pressable onPress={() => go('feed')} style={{ paddingBottom: 8 }}>
          <Banner s={11} tk={0.14} c={C.ink400}>
            ← Corner
          </Banner>
        </Pressable>
        <Display s={30} c={C.inkDeep}>
          Leaderboard
        </Display>
        <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 3 }}>
          {mode === 'places' ? "The city's tables, ranked." : "Who's eaten the city this year."}
        </SerifItalic>
        <View style={{ marginTop: 12 }}>
          <Segmented
            items={[
              { key: 'places', label: 'Restaurants' },
              { key: 'diners', label: 'Diners' },
            ]}
            value={mode}
            onChange={setMode}
            activeFg={C.inkDeep}
            inactiveFg={C.inkSoft}
            activeBorder={C.ink400}
          />
        </View>
      </View>
      {mode === 'places' ? <RestaurantsBoard /> : <DinersBoard />}
    </ScreenIn>
  );
}
