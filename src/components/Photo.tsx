/**
 * Photo with the design's warm print treatment. The prototype applies
 * `saturate(1.05) sepia(0.08)` (and brightness on the reel/thumbnails); React
 * Native has no CSS filters, so we approximate with a subtle warm overlay and
 * an optional darken scrim. The passed `style` carries dimensions + borders,
 * clipped to the box.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

export function Photo({
  source,
  style,
  warm = 0.08,
  darken = 0,
}: {
  source: ImageSource | number;
  style?: ViewStyle | ViewStyle[];
  warm?: number;
  darken?: number;
}) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
      {warm > 0 ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(120,80,30,${warm})` }]}
        />
      ) : null}
      {darken > 0 ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(42,26,6,${darken})` }]}
        />
      ) : null}
    </View>
  );
}
