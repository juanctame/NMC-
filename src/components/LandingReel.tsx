/**
 * Landing reel (native shim) — native builds show the first clip's still; the
 * looping HD video plays on web (LandingReel.web.tsx).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { REEL, type ReelClip } from '../data/landingReel';

export function LandingReel({ onClip }: { onClip?: (c: ReelClip | null) => void }) {
  const c = REEL.find((x) => x.poster) || null;
  React.useEffect(() => onClip?.(c), [c?.id]);
  if (!c?.poster) return null;
  return (
    <>
      <Image source={{ uri: c.poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,12,4,0.6)' }]} />
    </>
  );
}
