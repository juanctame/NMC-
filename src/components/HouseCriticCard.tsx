/**
 * A house critic (data/houseCritics.ts) in a rail or a board: real person, real
 * scores — their photo, handle and the top of their list. Opens their profile.
 */
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useStore } from '../store/useStore';
import { beenOf, mapEntries, placeOf, type HouseCritic } from '../data/houseCritics';
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
  const been = beenOf(c);
  const top = been[0];
  const topName = top ? placeOf(top)?.name || top.name : null;
  const map = mapEntries(c);
  const onMap = map.length;
  const cdmx = map.filter((e) => /ciudad de m[eé]xico/i.test(e.city || '')).length;
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
      <View style={{ borderTopWidth: 2, borderColor: C.inkBlack, backgroundColor: C.inkDeep, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: C.stampGreen, borderWidth: 1.5, borderColor: C.inkBlack, paddingVertical: 1, paddingHorizontal: 6, transform: [{ rotate: '-3deg' }] }}>
          <Banner s={7.5} tk={0.12} c={C.paper0}>
            House critic
          </Banner>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {top && topName ? (
            <Serif s={12.5} c={C.paper0} numberOfLines={1}>
              #1 {topName}
            </Serif>
          ) : (
            <Mono s={8.5} c={C.sun200} numberOfLines={1}>
              {onMap ? `${onMap} coffee shops on his map · ${cdmx} in CDMX` : `real scores · ${c.source} list coming in`}
            </Mono>
          )}
        </View>
        {top?.score != null ? (
          <Display s={15} c={C.sun300}>
            {top.score.toFixed(1)}
          </Display>
        ) : null}
      </View>
    </StickerPressable>
  );
}
