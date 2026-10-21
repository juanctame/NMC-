/**
 * The cover every profile dossier opens on (as the chef's does): a photo across
 * the top — here the dining room of the critic's #1 place —, the back button
 * and the Profile | Passport switch floating on it, and a credit line.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import type { Place } from '../store/data';
import { C } from '../theme/tokens';
import { Display, Mono } from './Text';
import { StickerView } from './Sticker';
import { VenueCover } from './Cover';
import { ProfileSwitch } from '../screens/CriticPassport';

export function DossierCover({ place, top, onBack, onPassport, credit }: { place?: Place; top: number; onBack: () => void; onPassport: () => void; credit: string }) {
  return (
    <View style={{ position: 'relative', height: 210 + top, borderBottomWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
      {place ? <VenueCover place={place} style={{ width: '100%', height: '100%' }} crestSize={64} darken={0.34} credit={false} /> : null}
      <View style={{ position: 'absolute', top: top + 8, left: 16 }}>
        <StickerView offset="sm" radius={999}>
          <Pressable onPress={onBack} accessibilityLabel="Back" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={18} c={C.ink400}>
              ←
            </Display>
          </Pressable>
        </StickerView>
      </View>
      <View style={{ position: 'absolute', top: top + 10, right: 16 }}>
        <ProfileSwitch mode="profile" onChange={(m) => m === 'passport' && onPassport()} />
      </View>
      {credit ? (
        <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(27,16,4,0.6)', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, maxWidth: '80%' }}>
          <Mono s={7.5} c={C.paper0} numberOfLines={1}>
            {credit}
          </Mono>
        </View>
      ) : null}
    </View>
  );
}
