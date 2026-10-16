/**
 * Top 4 — the four restaurants someone features on their profile, as four
 * sticker tiles (real cover, slot number, the category it's their favourite in).
 * Editable on your own passport: an empty slot invites you to fill it, a filled
 * one opens the picker to swap it; elsewhere a tile opens the restaurant.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useStore, resolvePlace } from '../store/useStore';
import { catLabel, favPlace, type TopFour } from '../data/favorites';
import { C } from '../theme/tokens';
import { Banner, Mono, SerifDisplay, Display } from './Text';
import { VenueCover } from './Cover';

const ROT = ['-2deg', '1.5deg', '1deg', '-1.5deg'];

/**
 * The compact form: four square tiles across, for the first section of a
 * profile (the passport's data page, the header card of someone's profile).
 */
function TopFourRow({ top, editable, owner, dark }: { top: TopFour; editable?: boolean; owner?: string; dark?: boolean }) {
  const openPlace = useStore((s) => s.openPlace);
  const openTopPicker = useStore((s) => s.openTopPicker);
  const nearbyById = useStore((s) => s.nearbyById);
  const fg = dark ? C.paper0 : C.inkDeep;
  const sub = dark ? C.sun300 : C.ink400;
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {top.map((t, i) => {
        const place = t ? resolvePlace(t.placeId, nearbyById) || favPlace(t.placeId) : undefined;
        if (!t || !place) {
          const empty = (
            <View style={{ width: '100%', aspectRatio: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: dark ? 'rgba(255,253,245,0.45)' : C.inkSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={16} c={dark ? C.ink100 : C.inkSoft}>
                {editable ? '+' : i + 1}
              </Display>
            </View>
          );
          return editable ? (
            <Pressable key={i} onPress={() => openTopPicker(i, null)} accessibilityLabel={`Add favourite Nº${i + 1}`} style={{ flex: 1, gap: 4 }}>
              {empty}
              <Mono s={7} c={dark ? C.ink100 : C.inkMuted} numberOfLines={1}>
                Nº{i + 1} · add
              </Mono>
            </Pressable>
          ) : (
            <View key={i} style={{ flex: 1 }}>
              {empty}
            </View>
          );
        }
        return (
          <Pressable
            key={i}
            onPress={() => (editable ? openTopPicker(i, null) : openPlace(place.id))}
            onLongPress={() => openPlace(place.id)}
            accessibilityLabel={`${owner ? owner + "'s" : 'Your'} Nº${i + 1}: ${place.name}`}
            style={{ flex: 1, gap: 4 }}
          >
            <View style={{ transform: [{ rotate: ROT[i] }] }}>
              <View style={{ position: 'absolute', top: 3, left: 3, right: -3, bottom: -3, backgroundColor: C.inkBlack }} />
              <View style={{ borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden', backgroundColor: C.paper0 }}>
                <VenueCover place={place} style={{ width: '100%', aspectRatio: 1 }} crestSize={24} credit={false} darken={0.1} />
                <View style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.sun400, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  <Display s={9} c={C.inkDeep}>
                    {i + 1}
                  </Display>
                </View>
              </View>
            </View>
            <SerifDisplay s={10.5} c={fg} numberOfLines={2} style={{ lineHeight: 12, marginTop: 2 }}>
              {place.name}
            </SerifDisplay>
            <Mono s={6.5} c={sub} numberOfLines={1}>
              ♥ {catLabel(t.category)}
            </Mono>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TopFourGrid({ top, editable, owner, variant = 'grid', dark }: { top: TopFour; editable?: boolean; owner?: string; variant?: 'grid' | 'row'; dark?: boolean }) {
  const openPlace = useStore((s) => s.openPlace);
  const openTopPicker = useStore((s) => s.openTopPicker);
  const nearbyById = useStore((s) => s.nearbyById);
  if (variant === 'row') return <TopFourRow top={top} editable={editable} owner={owner} dark={dark} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
      {top.map((t, i) => {
        const place = t ? resolvePlace(t.placeId, nearbyById) || favPlace(t.placeId) : undefined;
        if (!t || !place) {
          return editable ? (
            <Pressable
              key={i}
              onPress={() => openTopPicker(i, null)}
              accessibilityLabel={`Add favourite Nº${i + 1}`}
              style={{ width: '48%', aspectRatio: 0.86, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft, backgroundColor: 'rgba(255,253,245,0.55)', alignItems: 'center', justifyContent: 'center', gap: 4, transform: [{ rotate: ROT[i] }] }}
            >
              <Display s={22} c={C.inkSoft}>
                +
              </Display>
              <Banner s={8} tk={0.14} c={C.inkMuted}>
                Nº{i + 1} · add a favourite
              </Banner>
            </Pressable>
          ) : (
            <View key={i} style={{ width: '48%', aspectRatio: 0.86, borderWidth: 2, borderStyle: 'dashed', borderColor: C.ink100, transform: [{ rotate: ROT[i] }] }} />
          );
        }
        return (
          <Pressable
            key={i}
            onPress={() => (editable ? openTopPicker(i, null) : openPlace(place.id))}
            onLongPress={() => openPlace(place.id)}
            accessibilityLabel={`${owner ? owner + "'s" : 'Your'} Nº${i + 1}: ${place.name}`}
            style={{ width: '48%', transform: [{ rotate: ROT[i] }] }}
          >
            <View style={{ position: 'absolute', top: 5, left: 5, right: -5, bottom: -5, backgroundColor: C.inkBlack }} />
            <View style={{ borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, overflow: 'hidden' }}>
              <VenueCover place={place} style={{ width: '100%', aspectRatio: 1.15 }} crestSize={38} credit={false} darken={0.12} />
              <View style={{ position: 'absolute', top: 6, left: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
                <Display s={12} c={C.inkDeep}>
                  {i + 1}
                </Display>
              </View>
              <View style={{ paddingHorizontal: 7, paddingTop: 5, paddingBottom: 7, borderTopWidth: 2, borderColor: C.inkBlack, gap: 2 }}>
                <SerifDisplay s={13.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 16 }}>
                  {place.name}
                </SerifDisplay>
                <Mono s={7.5} c={C.ink400} numberOfLines={1}>
                  ♥ {catLabel(t.category)}
                </Mono>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
