/**
 * Passport (You) — the profile rendered as a vintage travel passport: dark
 * passport card + stat strip, recent stamps, cuisine standings, taste tags.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { scoreStyle, fmt } from '../store/helpers';
import { C, col } from '../theme/tokens';
import { identity } from '../data/profile';
import { cityById } from '../data/cities';
import { Display, Banner, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Roundel } from '../components/Roundel';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

const CUISINE_TOP: [string, number][] = [
  ['Tacos', 24],
  ['Mariscos', 15],
  ['Panaderías', 11],
  ['Mole', 8],
];
const CMAX = 24;
const TASTE_TAGS = ['Tacos al pastor', 'Mariscos', 'Panaderías', 'Mezcal', 'Antojitos'];

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

export function Passport() {
  const insets = useSafeAreaInsets();
  const ranked = useStore((s) => s.ranked);
  const profile = useStore((s) => s.profile);
  const signOut = useStore((s) => s.signOut);
  const me = identity(profile);
  const homeCity = cityById(me.cityId);
  const beenTotal = ranked.length;

  const scores = ranked.map((r) => r.score!);
  const avg = scores.length ? fmt(scores.reduce((a, b) => a + b, 0) / scores.length) : '0.0';
  const cuisineCount: Record<string, number> = {};
  ranked.forEach((r) => {
    cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
  });
  const stats = { year: 41, cuisines: Object.keys(cuisineCount).length + 4, avg };
  const recentStamps = ranked.slice(0, 6);

  return (
    <ScreenIn>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* passport card */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: col(me.color), borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  <Banner s={18} c={C.paper0}>
                    {me.initials}
                  </Banner>
                </View>
              </StickerView>
              <View style={{ flex: 1 }}>
                <Display s={22} c={C.paper0} numberOfLines={1}>
                  {me.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }}>
                  PASSPORT Nº {me.passportNo.toLocaleString()} · EST. {me.joined} · {homeCity.name.toUpperCase()}
                </Mono>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16, borderWidth: 2, borderColor: C.paper0 }}>
              <StatCell value={beenTotal} label="Ranked" />
              <StatCell value={stats.year} label="This year" />
              <StatCell value={stats.cuisines} label="Cuisines" />
              <StatCell value={stats.avg} label="Avg score" last />
            </View>
          </StickerView>
        </View>

        {/* recent stamps */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            Recent stamps
          </Banner>
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

        {/* cuisine standings */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            Where you rank cuisines
          </Banner>
          <View style={{ gap: 9 }}>
            {CUISINE_TOP.map(([name, count]) => (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Banner s={10} tk={0.06} c={C.inkDeep} style={{ width: 76 }}>
                  {name}
                </Banner>
                <View style={{ flex: 1, height: 14, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper100 }}>
                  <View style={{ height: '100%', width: `${Math.round((count / CMAX) * 100)}%`, backgroundColor: C.sun400 }} />
                </View>
                <Mono s={10} c={C.inkMuted} style={{ width: 30, textAlign: 'right' }}>
                  {count}
                </Mono>
              </View>
            ))}
          </View>
        </View>

        {/* taste tags */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            What you chase
          </Banner>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TASTE_TAGS.map((name) => (
              <StickerView key={name} offset="sm" radius={999} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Banner s={10} tk={0.1} c={C.inkDeep}>
                  {name}
                </Banner>
              </StickerView>
            ))}
          </View>
        </View>

        {/* account */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16, paddingBottom: 34 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            Account
          </Banner>
          <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Banner s={11} tk={0.06} c={C.inkDeep}>
                {me.handle}
              </Banner>
              <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
                {profile ? 'Local account · this device' : 'Guest · demo identity'}
              </Mono>
            </View>
            <StickerPressable offset="sm" radius={999} onPress={signOut} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13 }}>
              <Banner s={9.5} tk={0.1} c={C.ink400}>
                {profile ? 'Sign out' : 'Create account'}
              </Banner>
            </StickerPressable>
          </View>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
