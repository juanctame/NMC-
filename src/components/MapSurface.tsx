/**
 * MapSurface (native) — the brand's printed-paper map: an inked grid, hood
 * labels, a "you" marker, and the pins projected onto the city's bbox. This is
 * the fallback used on iOS/Android, where the Google Maps JS API can't run;
 * the web build swaps in MapSurface.web.tsx (a real Google Map). A native build
 * would move to react-native-maps.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Line, Ellipse, G } from 'react-native-svg';
import { projectToBox, type City } from '../data/cities';
import type { Pin } from '../data/geo';
import { C } from '../theme/tokens';
import { Display, Banner } from './Text';
import { StickerView } from './Sticker';

const CDMX_HOODS = [
  { name: 'Centro', x: 72, y: 14, rot: '-3deg' },
  { name: 'Juárez', x: 50, y: 29, rot: '-2deg' },
  { name: 'Polanco', x: 22, y: 15, rot: '2deg' },
  { name: 'Roma Nte', x: 57, y: 38, rot: '-2deg', strong: true },
  { name: 'Condesa', x: 33, y: 62, rot: '3deg', strong: true },
  { name: 'Narvarte', x: 70, y: 82, rot: '-2deg' },
];

type Props = {
  pins: Pin[];
  city: City;
  selPin: { kind: string; id: string } | null;
  onSelect: (p: { kind: string; id: string }) => void;
};

export function MapSurface({ pins, city, selPin, onSelect }: Props) {
  const shown = pins
    .map((p) => ({ p, pr: projectToBox(p.coord.lat, p.coord.lon, city.bbox) }))
    .filter((x) => x.pr.inside)
    .slice(0, 70);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.paper100, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <G stroke={C.inkBlack} strokeWidth={0.35} opacity={0.13}>
          <Line x1="0" y1="16" x2="100" y2="20" />
          <Line x1="0" y1="34" x2="100" y2="38" />
          <Line x1="0" y1="52" x2="100" y2="56" />
          <Line x1="0" y1="70" x2="100" y2="74" />
          <Line x1="0" y1="86" x2="100" y2="90" />
          <Line x1="16" y1="0" x2="12" y2="100" />
          <Line x1="34" y1="0" x2="31" y2="100" />
          <Line x1="52" y1="0" x2="49" y2="100" />
          <Line x1="70" y1="0" x2="67" y2="100" />
          <Line x1="86" y1="0" x2="84" y2="100" />
        </G>
        <Line x1="14" y1="4" x2="72" y2="44" stroke={C.ink400} strokeWidth={0.8} opacity={0.4} />
        <Line x1="50" y1="0" x2="46" y2="100" stroke={C.ink400} strokeWidth={0.8} opacity={0.35} />
        <Ellipse cx="37" cy="59" rx="8" ry="5.5" fill={C.stampGreen} opacity={0.22} stroke={C.inkBlack} strokeWidth={0.3} />
        <Ellipse cx="74" cy="15" rx="5" ry="3.5" fill={C.stampGreen} opacity={0.18} stroke={C.inkBlack} strokeWidth={0.3} />
      </Svg>

      {city.id === 'cdmx'
        ? CDMX_HOODS.map((h) => (
            <View key={h.name} pointerEvents="none" style={{ position: 'absolute', left: `${h.x}%`, top: `${h.y}%`, transform: [{ translateX: -28 }, { translateY: -8 }, { rotate: h.rot }] }}>
              <Banner s={h.strong ? 11 : 10} tk={0.17} c={h.strong ? C.inkMuted : C.inkSoft} style={{ width: 90, textAlign: 'center' }}>
                {h.name}
              </Banner>
            </View>
          ))
        : null}

      {/* You marker */}
      <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -22, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(216,80,26,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.ink400, borderWidth: 2.5, borderColor: C.paper0 }} />
        </View>
        <View style={{ marginTop: 2, backgroundColor: C.paper0, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 7 }}>
          <Banner s={8} tk={0.14} c={C.ink400}>
            {city.name}
          </Banner>
        </View>
      </View>

      {/* pins */}
      {shown.map(({ p, pr }) => {
        const isSel = !!selPin && selPin.kind === p.kind && selPin.id === p.id;
        const size = isSel ? 42 : p.kind === 'grade' && p.dashed ? 34 : 32;
        return (
          <View key={p.kind + p.id} style={{ position: 'absolute', left: `${pr.x}%`, top: `${pr.y}%`, marginLeft: -size / 2, marginTop: -size / 2, zIndex: isSel ? 30 : p.kind === 'event' ? 14 : p.kind === 'table' ? 13 : 12 }}>
            <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
              <Pressable onPress={() => onSelect({ kind: p.kind, id: p.id })} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.bg, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                {p.dashed ? <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: size / 2, borderWidth: 2, borderColor: p.fg, borderStyle: 'dashed' }} /> : null}
                <Display s={isSel ? 13 : 11} c={p.fg}>
                  {p.metric}
                </Display>
              </Pressable>
            </StickerView>
          </View>
        );
      })}
    </View>
  );
}
