/**
 * A house critic (data/houseCritics.ts) in a rail or a board — the same card as
 * every critic's: their photo and handle, their #1 (verdict, house score, their
 * words), and the house badge. Opens their profile.
 */
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useStore } from '../store/useStore';
import { type HouseCritic } from '../data/houseCritics';
import { HOUSE_CATEGORIES, houseAvg, rankedIn } from '../data/houseRanking';
import { HouseTag, VerdictStamp, VERDICT_COLOR } from './CriticMarks';
import { C } from '../theme/tokens';
import { Banner, Display, Mono, Serif } from './Text';
import { StickerPressable } from './Sticker';
import { Monogram } from './Monogram';

export function HouseAvatar({ c, size }: { c: HouseCritic; size: number }) {
  const [ok, setOk] = React.useState(!!c.photo);
  if (!ok || !c.photo) return <Monogram name={c.name} size={size} rot="-4deg" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
      <Image source={{ uri: c.photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setOk(false)} accessibilityLabel={c.name} />
    </View>
  );
}

export function HouseCriticCard({ c, width = 286 }: { c: HouseCritic; width?: number | '100%' }) {
  const openCritic = useStore((s) => s.openCritic);
  const following = useStore((s) => !!s.follows['critic:' + c.id]);
  const toggleFollow = useStore((s) => s.toggleFollow);
  // His #1 in Mexico City, like every critic's best take.
  const top = rankedIn(c, 'all', 'cdmx')[0] || rankedIn(c, 'all', 'mx')[0];
  const all = rankedIn(c, 'all', 'mx');
  const cats = HOUSE_CATEGORIES.filter((x) => rankedIn(c, x.id, 'mx').length).length;
  return (
    <StickerPressable offset="lg" onPress={() => openCritic(c.id)} accessibilityLabel={`Critic: ${c.name}`} style={{ width, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12 }}>
        <HouseAvatar c={c} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={11} tk={0.04} c={C.inkDeep} numberOfLines={1}>
            {c.name}
          </Banner>
          <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 1 }} numberOfLines={1}>
            {[c.handle, c.source].join(' · ')}
          </Mono>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => toggleFollow('critic:' + c.id)}
          accessibilityLabel={following ? `Following ${c.name}` : `Follow ${c.name}`}
          style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.ink400, paddingVertical: 6, paddingHorizontal: 10 }}
        >
          <Banner s={8.5} tk={0.1} c={C.paper0}>
            {following ? 'Following' : 'Follow'}
          </Banner>
        </StickerPressable>
      </View>
      {top ? (
        <View style={{ borderTopWidth: 2, borderColor: C.inkBlack, backgroundColor: C.sun100, paddingVertical: 10, paddingHorizontal: 12, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Serif s={14} c={C.inkDeep} numberOfLines={1}>
                #1 {top.entry.name}
              </Serif>
              <VerdictStamp v={top.verdict} small />
            </View>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: VERDICT_COLOR[top.verdict].bg, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
                <Display s={15} c={VERDICT_COLOR[top.verdict].fg}>
                  {top.score.toFixed(1)}
                </Display>
              </View>
              <HouseTag />
            </View>
          </View>
          {top.entry.note ? (
            <Serif s={12.5} c={C.inkDeep} numberOfLines={3} style={{ lineHeight: 17 }}>
              “{top.quote}”
            </Serif>
          ) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 2, borderColor: C.inkBlack }}>
        <View style={{ backgroundColor: C.stampGreen, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
          <Banner s={7.5} tk={0.1} c={C.paper0}>
            House critic
          </Banner>
        </View>
        <Mono s={8.5} c={C.inkMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
          {all.length} places · {cats} categories · avg {houseAvg(c).toFixed(1)}
        </Mono>
      </View>
    </StickerPressable>
  );
}
