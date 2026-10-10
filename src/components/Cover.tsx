/**
 * PlaceCover — a venue's cover image.
 *
 * Priority: the restaurant's REAL photo when we have one (live Google Maps photo,
 * served with attribution). Otherwise we generate a DISTINCT cover so no two
 * restaurants look alike even though the bundled photo pool is small: a stock
 * food texture, darkened and washed in a per-venue colour (from the name), with
 * the venue's own monogram crest and an optional cuisine eyebrow. Deterministic,
 * offline, and compliant — our own artwork, not the restaurant's logo.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Photo } from './Photo';
import { Grain } from './Grain';
import { Monogram, coverColors } from './Monogram';
import { Banner } from './Text';
import { C } from '../theme/tokens';
import { photo } from '../assets';

type CoverPlace = { name: string; photo: string; cuisine?: string; category?: string; photoUrl?: string };

export function PlaceCover({
  place,
  photoUrl,
  style,
  crestSize = 54,
  eyebrow = false,
  darken = 0.46,
}: {
  place: CoverPlace;
  /** Overrides place.photoUrl (e.g. a live-resolved Google photo). */
  photoUrl?: string;
  style?: ViewStyle | ViewStyle[];
  crestSize?: number;
  eyebrow?: boolean;
  darken?: number;
}) {
  const realUrl = photoUrl || place.photoUrl;
  if (realUrl) {
    return <Photo source={{ uri: realUrl }} style={style} darken={eyebrow ? 0.06 : 0} />;
  }
  const { wash, deep } = coverColors(place.name);
  const label = place.category || place.cuisine;
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: deep, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Photo source={photo(place.photo)} style={StyleSheet.absoluteFill} warm={0.02} darken={darken} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
      <Grain opacity={0.14} />
      <Monogram name={place.name} size={crestSize} bg={C.paper0} fg={C.inkDeep} rot="-5deg" />
      {eyebrow && label ? (
        <View style={{ marginTop: 8, backgroundColor: 'rgba(27,16,4,0.55)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
          <Banner s={8.5} tk={0.14} c={C.paper0} numberOfLines={1}>
            {label}
          </Banner>
        </View>
      ) : null}
    </View>
  );
}
