/**
 * Another foodie's taste identity. Opened from the leaderboard or the "palates
 * like yours" module. Shows their archetype + palate radar (derived from their
 * taste lean), their flavor DNA, and — the social hook — how closely their
 * palate matches yours. Follow them right from here.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { FRIENDS } from '../store/data';
import { identity } from '../data/profile';
import { computePalate, friendPalate, tasteMatch, PALATE_AXES } from '../data/palate';
import { C, col } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { PalateRadar } from '../components/PalateRadar';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

export function FoodieProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeFoodieId);
  const go = useStore((s) => s.go);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const profile = useStore((s) => s.profile);
  const t = useT();

  const friend = FRIENDS.find((f) => f.id === id);
  if (!friend) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;

  const palate = friendPalate(friend);
  const mine = computePalate(ranked, tastes, userReviews);
  const match = tasteMatch(mine, palate);
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));
  const following = !!follows[friend.id];
  const handle = '@' + friend.name.split(' ')[0].toLowerCase();
  const me = identity(profile);
  const dnaTotal = palate.topCuisines.reduce((sum, c) => sum + c.count, 0) || 1;

  const matchColor = match >= 80 ? C.stampGreen : match >= 60 ? C.sun500 : C.ink400;

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* header card */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pressable onPress={() => go('board' as any)} style={{ paddingRight: 8, paddingVertical: 4 }}>
              <Display s={20} c={C.ink400}>
                ←
              </Display>
            </Pressable>
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              {t('foodie.title')}
            </Banner>
          </View>

          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: col(friend.color), borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  <Banner s={18} c={C.paper0}>
                    {friend.initials}
                  </Banner>
                </View>
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Display s={22} c={C.paper0} numberOfLines={1}>
                  {friend.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }}>
                  {handle} · {friend.year} {t('foodie.placesYear')}
                </Mono>
              </View>
            </View>
            {/* match with you */}
            {profile ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 14 }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: matchColor, borderWidth: 2.5, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] }}>
                  <Display s={19} c={C.paper0}>
                    {match}
                  </Display>
                </View>
                <View style={{ flex: 1 }}>
                  <Banner s={11} tk={0.1} c={C.paper0}>
                    {t('foodie.match')}
                  </Banner>
                  <Serif s={12.5} c={C.ink100} style={{ marginTop: 3, lineHeight: 18 }}>
                    {me.name.split(' ')[0]} · {friend.name.split(' ')[0]}
                  </Serif>
                </View>
                <StickerPressable offset="sm" radius={999} onPress={() => toggleFollow(friend.id)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.sun400, paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Banner s={10} tk={0.1} c={following ? C.greenFg : C.inkDeep}>
                    {following ? t('foodie.following') : t('foodie.follow')}
                  </Banner>
                </StickerPressable>
              </View>
            ) : null}
          </StickerView>
        </View>

        {/* archetype + radar */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 16, overflow: 'hidden' }}>
            <Grain opacity={0.05} />
            <Display s={24} c={C.ink400} style={{ lineHeight: 25 }}>
              {t('arch.' + palate.archId + '.t')}
            </Display>
            <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 5, lineHeight: 19 }}>
              {t('arch.' + palate.archId + '.b')}
            </SerifItalic>
            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <PalateRadar axes={palate.axes} labels={axisLabels} size={228} />
            </View>
          </StickerView>
        </View>

        {/* flavor DNA */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            {t('you.flavorDna')}
          </Banner>
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
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
