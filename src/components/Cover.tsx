/**
 * PlaceCover — a venue's cover image.
 *
 * A real picture of the restaurant whenever we have one (data/media.ts picks
 * it: its own photography, a diner's or creator's shot, or the press'), with a
 * fallback URL tried before giving up. With none at all — or if they fail to
 * load — the cover is the venue's own brand art: its colour (from the name),
 * grain, a pattern of its cuisine's motif and its monogram crest. Never a stock
 * photo of some other food. Deterministic, offline, and our own artwork, not
 * the restaurant's logo.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Photo } from './Photo';
import { Grain } from './Grain';
import { Monogram, coverColors } from './Monogram';
import { Banner, Mono } from './Text';
import { C } from '../theme/tokens';
import { cuisineAxis } from '../data/palate';
import { MOTIF_GLYPH } from './PapelPicado';
import { staticCover } from '../data/media';
import type { Place } from '../store/data';

type CoverPlace = { name: string; photo: string; cuisine?: string; category?: string; photoUrl?: string };

export function PlaceCover({
  place,
  photoUrl,
  fallbackUrl,
  style,
  crestSize = 54,
  eyebrow = false,
  darken = 0.46,
  credit,
}: {
  place: CoverPlace;
  /** Overrides place.photoUrl (e.g. a live-resolved Google photo). */
  photoUrl?: string;
  /** Tried if photoUrl fails to load. */
  fallbackUrl?: string;
  style?: ViewStyle | ViewStyle[];
  crestSize?: number;
  eyebrow?: boolean;
  darken?: number;
  /** Source of the real photo, shown as a subtle chip (e.g. "Time Out México"). */
  credit?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const realUrl = [photoUrl || place.photoUrl, fallbackUrl].find((u) => u && !failed.includes(u));
  if (realUrl) {
    // A remote picture can fail (hotlink protection, moved); fall back to the generated cover.
    return (
      <View style={[{ overflow: 'hidden' }, style]}>
        <Photo source={{ uri: realUrl }} style={StyleSheet.absoluteFill} darken={eyebrow ? 0.06 : 0} onError={() => setFailed((f) => [...f, realUrl])} />
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
  const glyph = MOTIF_GLYPH[cuisineAxis(place.cuisine || '')] || '◆';
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: deep, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash, opacity: 0.55 + darken * 0.3 }]} />
      {/* the venue's brand art: its cuisine's motif, printed like a sticker sheet */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', opacity: 0.16, transform: [{ rotate: '-12deg' }, { scale: 1.4 }] }]}>
        {Array.from({ length: 48 }, (_, i) => (
          <Text key={i} style={{ width: 34, textAlign: 'center', fontSize: 18, lineHeight: 30, color: C.paper0 }}>
            {glyph}
          </Text>
        ))}
      </View>
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

/**
 * A venue's cover from its best real picture (media.ts — unique per venue,
 * chosen to fit it), with its fallback and credit, else its brand art.
 */
export function VenueCover({
  place,
  style,
  crestSize = 40,
  darken,
  credit = true,
}: {
  place: Place;
  style?: ViewStyle | ViewStyle[];
  crestSize?: number;
  darken?: number;
  credit?: boolean;
}) {
  const pic = staticCover(place);
  return (
    <PlaceCover
      place={place}
      photoUrl={pic?.url}
      fallbackUrl={pic?.fallback}
      credit={credit ? pic?.credit.replace(/^(Photo|Still):\s*/, '') : undefined}
      style={style}
      crestSize={crestSize}
      darken={darken}
    />
  );
}
