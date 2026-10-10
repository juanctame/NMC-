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
import React, { useState } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Photo } from './Photo';
import { Grain } from './Grain';
import { Monogram, coverColors } from './Monogram';
import { Banner, Mono } from './Text';
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
  credit,
}: {
  place: CoverPlace;
  /** Overrides place.photoUrl (e.g. a live-resolved Google photo). */
  photoUrl?: string;
  style?: ViewStyle | ViewStyle[];
  crestSize?: number;
  eyebrow?: boolean;
  darken?: number;
  /** Source of the real photo, shown as a subtle chip (e.g. "Time Out México"). */
  credit?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const candidate = photoUrl || place.photoUrl;
  const realUrl = candidate && candidate !== failed ? candidate : undefined;
  if (realUrl) {
    // A remote picture can fail (hotlink protection, moved); fall back to the generated cover.
    return (
      <View style={[{ overflow: 'hidden' }, style]}>
        <Photo source={{ uri: realUrl }} style={StyleSheet.absoluteFill} darken={eyebrow ? 0.06 : 0} onError={() => setFailed(realUrl)} />
        {credit ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: 4, bottom: 4, maxWidth: '80%', backgroundColor: 'rgba(27,16,4,0.55)', borderRadius: 3, paddingVertical: 1, paddingHorizontal: 4 }}>
            <Mono s={6.5} c={C.paper0} numberOfLines={1}>
              {credit}
            </Mono>
          </View>
        ) : null}
      </View>
    );
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
