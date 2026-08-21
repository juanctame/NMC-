/**
 * Provenance pill — shown ONLY when the venue list came from the shared,
 * server-swept cache (nearbyStatus === 'cached'), making the sweep visible:
 * "shared index · updated 3h ago". A live-green dot signals a fresh, community
 * index. Renders nothing on the live browser sweep or offline fallback, so it
 * appears exactly when the cached backend is doing the work.
 */
import React from 'react';
import { View } from 'react-native';
import { useStore } from '../store/useStore';
import { cacheAgeLabel } from '../data/placesCache';
import { StickerView } from './Sticker';
import { Mono } from './Text';
import { C } from '../theme/tokens';

export function CacheChip() {
  const status = useStore((s) => s.nearbyStatus);
  const updatedAt = useStore((s) => s.nearbyUpdatedAt);
  if (status !== 'cached') return null;
  return (
    <StickerView
      offset="sm"
      radius={999}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: C.paper0,
        borderWidth: 1.5,
        borderColor: C.inkBlack,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 9,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.stampGreen, borderWidth: 1, borderColor: C.inkBlack }} />
      <Mono s={8.5} c={C.inkMuted}>
        shared index · {cacheAgeLabel(updatedAt)}
      </Mono>
    </StickerView>
  );
}
