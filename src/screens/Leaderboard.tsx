/**
 * Leaderboard — friends ranked by places eaten this year. Podium for the top 3,
 * then ranked rows with follow toggles. "You" is folded into the standings.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { FRIENDS } from '../store/data';
import { C, col } from '../theme/tokens';
import { Display, Banner, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { ScreenIn } from '../components/Anim';

const MEDALS = ['①', '②', '③'];

export function Leaderboard() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const rankedLen = useStore((s) => s.ranked.length);

  const me = { id: 'me', name: 'You · June', initials: 'JO', color: C.sun400, year: 41, match: 'your log', isMe: true };
  const all = [...FRIENDS, me].slice().sort((a, b) => b.year - a.year);
  const podium = all.slice(0, 3);

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <Pressable onPress={() => go('feed')} style={{ paddingBottom: 8 }}>
          <Banner s={11} tk={0.14} c={C.ink400}>
            ← Corner
          </Banner>
        </Pressable>
        <Display s={30} c={C.inkDeep}>
          Leaderboard
        </Display>
        <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 3 }}>
          Who's eaten the city this year.
        </SerifItalic>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* podium */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 18 }}>
          {podium.map((p, i) => {
            const size = i === 0 ? 68 : 56;
            const rot = i === 0 ? '-5deg' : i === 1 ? '4deg' : '-3deg';
            return (
              <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: rot }] }}>
                  <View
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: col(p.color),
                      borderWidth: 2.5,
                      borderColor: C.inkBlack,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
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

        {/* rows */}
        <View style={{ gap: 9 }}>
          {all.map((p, i) => {
            const isMe = 'isMe' in p && p.isMe;
            const following = isMe ? false : !!follows[p.id];
            return (
              <StickerView
                key={p.id}
                offset={isMe ? 'lg' : 'sm'}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  backgroundColor: isMe ? C.sun100 : C.paper0,
                  borderWidth: 2.5,
                  borderColor: C.inkBlack,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                }}
              >
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
                  <StickerPressable
                    offset="sm"
                    radius={999}
                    onPress={() => toggleFollow(p.id)}
                    style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.paper0, paddingVertical: 6, paddingHorizontal: 11 }}
                  >
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
    </ScreenIn>
  );
}
