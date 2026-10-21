/**
 * VenueRow — one restaurant in a profile's list (a chef's or a group's rooms):
 * its monogram, name, category · neighbourhood, guide badge / acclaim / "new"
 * chips, and a tap-through to the full place profile.
 */
import React from 'react';
import { View } from 'react-native';
import { guideBadgeOf } from '../data/chefs';
import { C } from '../theme/tokens';
import { Display, Banner, SerifDisplay, Mono } from './Text';
import { StickerPressable } from './Sticker';
import { Monogram } from './Monogram';
import type { Place } from '../store/data';

export function VenueRow({ place, onOpen }: { place: Place; onOpen: () => void }) {
  const badge = guideBadgeOf(place);
  return (
    <StickerPressable
      offset="sm"
      onPress={onOpen}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 11 }}
    >
      <Monogram name={place.name} size={44} rot="-4deg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={16} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
          {place.name}
        </SerifDisplay>
        <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
          {place.category || place.cuisine} · {place.hood}
        </Mono>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {badge ? (
            <View style={{ backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
              <Banner s={7.5} tk={0.06} c={C.paper0}>
                {badge}
              </Banner>
            </View>
          ) : null}
          {typeof place.acclaim === 'number' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={8} c={C.sun600}>
                ◆ {place.acclaim}
              </Banner>
            </View>
          ) : null}
          {place.moment === 'Apertura 2026' ? (
            <View style={{ backgroundColor: C.stampGreen, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={7.5} tk={0.06} c={C.paper0}>
                New · 2026
              </Banner>
            </View>
          ) : null}
        </View>
      </View>
      <Display s={18} c={C.inkSoft}>
        →
      </Display>
    </StickerPressable>
  );
}
