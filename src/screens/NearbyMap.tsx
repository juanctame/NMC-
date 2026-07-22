/**
 * Nearby map — real restaurants + food stalls for the selected city, plotted by
 * their true GPS coordinates (projected onto the city's bounding box) on the
 * brand's printed-paper map. Places the user has ranked show a green score
 * roundel; everything else shows its price tier. Tap a pin for the detail card.
 */
import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Ellipse, G } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { projectToBox } from '../data/cities';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { ScreenIn } from '../components/Anim';
import type { Place } from '../store/data';
import type { City } from '../data/cities';

const CDMX_HOODS = [
  { name: 'Centro', x: 72, y: 14, rot: '-3deg' },
  { name: 'Juárez', x: 50, y: 29, rot: '-2deg' },
  { name: 'Polanco', x: 22, y: 15, rot: '2deg' },
  { name: 'Roma Nte', x: 57, y: 38, rot: '-2deg', strong: true },
  { name: 'Condesa', x: 33, y: 62, rot: '3deg', strong: true },
  { name: 'Narvarte', x: 70, y: 82, rot: '-2deg' },
];

const PRICE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '$', label: '$' },
  { key: '$$', label: '$$' },
  { key: '$$$', label: '$$$' },
];

function distanceMin(city: City, lat: number, lon: number): string {
  const R = 6371000;
  const dLat = ((lat - city.center.lat) * Math.PI) / 180;
  const dLon = ((lon - city.center.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((city.center.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const m = 2 * R * Math.asin(Math.sqrt(a));
  const min = Math.round(m / 80); // ~80 m/min walking
  if (min <= 2) return 'right here';
  if (min <= 25) return `~${min} min walk`;
  return `~${(m / 1000).toFixed(1)} km`;
}

export function NearbyMap() {
  const insets = useSafeAreaInsets();
  const closeMap = useStore((s) => s.closeMap);
  const city = useStore((s) => s.city);
  const nearby = useStore((s) => s.nearby);
  const status = useStore((s) => s.nearbyStatus);
  const loadNearby = useStore((s) => s.loadNearby);
  const mapFilter = useStore((s) => s.mapFilter);
  const setMapFilter = useStore((s) => s.setMapFilter);
  const selPin = useStore((s) => s.selPin);
  const selectPin = useStore((s) => s.selectPin);
  const openPlace = useStore((s) => s.openPlace);
  const openCitySheet = useStore((s) => s.openCitySheet);
  const ranked = useStore((s) => s.ranked);

  const rankedById: Record<string, number> = {};
  ranked.forEach((r) => {
    if (r.score != null) rankedById[r.id] = r.score;
  });

  const priceSel = mapFilter as string;
  const pins = nearby
    .filter((p) => p.lat != null && p.lon != null)
    .filter((p) => priceSel === 'all' || p.price === priceSel)
    .map((p) => ({ p, pr: projectToBox(p.lat!, p.lon!, city.bbox) }))
    .filter((x) => x.pr.inside)
    .slice(0, 60);

  const selected = selPin ? nearby.find((p) => p.id === selPin.id) : null;

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      {/* header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 10, backgroundColor: C.paper50, borderBottomWidth: 2.5, borderColor: C.inkBlack }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={closeMap} style={{ paddingHorizontal: 4 }}>
            <Display s={20} c={C.ink400}>
              ←
            </Display>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={openCitySheet} hitSlop={6}>
            <Display s={24} c={C.inkDeep}>
              Nearby
            </Display>
            <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
              {city.flag} {city.name} · {city.defaultHood} · {city.weather} ▾
            </Mono>
          </Pressable>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={() => loadNearby()} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={15} c={C.ink400}>
                ↻
              </Display>
            </Pressable>
          </StickerView>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 2 }}>
          {PRICE_FILTERS.map((f) => {
            const on = mapFilter === (f.key as any);
            return (
              <Pressable key={f.key} onPress={() => setMapFilter(f.key as any)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: on ? C.ink400 : C.paper0 }}>
                <Banner s={10} tk={0.12} c={on ? C.paper0 : C.inkDeep}>
                  {f.label}
                </Banner>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <View style={{ justifyContent: 'center' }}>
            <Mono s={9} c={C.inkSoft}>
              {status === 'loading' ? 'loading…' : `${pins.length} places`}
            </Mono>
          </View>
        </ScrollView>
      </View>

      {/* map surface */}
      <View style={{ flex: 1, backgroundColor: C.paper100, overflow: 'hidden' }}>
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

        {/* You marker (city center) */}
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

        {/* real restaurant pins */}
        {pins.map(({ p, pr }) => {
          const isSel = !!selPin && selPin.id === p.id;
          const ranked = rankedById[p.id];
          const isRanked = ranked != null;
          const ss = isRanked ? scoreStyle(ranked) : null;
          const size = isSel ? 40 : 30;
          const metric = isRanked ? fmt(ranked) : p.price;
          return (
            <View key={p.id} style={{ position: 'absolute', left: `${pr.x}%`, top: `${pr.y}%`, marginLeft: -size / 2, marginTop: -size / 2, zIndex: isSel ? 30 : isRanked ? 14 : 10 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Pressable
                  onPress={() => selectPin({ kind: isRanked ? 'spot' : 'place', id: p.id })}
                  style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: isRanked ? ss!.bg : C.ink400, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}
                >
                  {isRanked ? (
                    <View pointerEvents="none" style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: size / 2, borderWidth: 2, borderColor: ss!.fg, borderStyle: 'dashed' }} />
                  ) : null}
                  <Display s={isSel ? 13 : 11} c={isRanked ? ss!.fg : C.paper0}>
                    {metric}
                  </Display>
                </Pressable>
              </StickerView>
            </View>
          );
        })}

        {/* legend */}
        <View style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 5 }}>
          <StickerView offset="sm" style={{ flexDirection: 'row', gap: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 7, paddingHorizontal: 11 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack }} />
              <Mono s={9} c={C.inkMuted}>
                Places
              </Mono>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.stampGreen, borderWidth: 1.5, borderColor: C.inkBlack }} />
              <Mono s={9} c={C.inkMuted}>
                Your ranked
              </Mono>
            </View>
          </StickerView>
        </View>

        {/* status overlays */}
        {status === 'loading' ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={C.ink400} />
              <Banner s={11} tk={0.14} c={C.inkDeep}>
                Reading the streets…
              </Banner>
              <Mono s={9} c={C.inkMuted}>
                {city.name} · {city.defaultHood}
              </Mono>
            </StickerView>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, alignItems: 'center', gap: 8 }}>
              <Banner s={11} tk={0.14} c={C.inkDeep}>
                Couldn't reach the map
              </Banner>
              <SerifItalic s={12.5} c={C.inkMuted} style={{ textAlign: 'center' }}>
                No live places for {city.name} right now.
              </SerifItalic>
              <StickerPressable offset="sm" radius={999} onPress={() => loadNearby()} style={{ marginTop: 4, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 16 }}>
                <Banner s={11} tk={0.1} c={C.paper0}>
                  Try again
                </Banner>
              </StickerPressable>
            </StickerView>
          </View>
        ) : null}

        {/* select card */}
        {selected ? (
          <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 25 }}>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
              <Photo source={photo(selected.photo)} style={{ width: 56, height: 56, borderWidth: 2, borderColor: C.inkBlack }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <SerifDisplay s={16} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 16 }}>
                  {selected.name}
                </SerifDisplay>
                <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
                  {metaOf(selected)}
                </Mono>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <View style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: rankedById[selected.id] != null ? scoreStyle(rankedById[selected.id]).bg : C.sun400 }}>
                    <Banner s={9} tk={0.08} c={rankedById[selected.id] != null ? scoreStyle(rankedById[selected.id]).fg : C.inkDeep}>
                      {rankedById[selected.id] != null ? `Nº your ${fmt(rankedById[selected.id])}` : 'Not yet ranked'}
                    </Banner>
                  </View>
                  {selected.lat != null ? (
                    <Mono s={9} c={C.inkSoft}>
                      {distanceMin(city, selected.lat, selected.lon!)}
                    </Mono>
                  ) : null}
                </View>
              </View>
              <StickerPressable offset="sm" radius={999} onPress={() => openPlace(selected.id)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 12 }}>
                <Banner s={10} tk={0.1} c={C.paper0}>
                  See place →
                </Banner>
              </StickerPressable>
              <View style={{ position: 'absolute', top: -10, right: -8 }}>
                <StickerView offset="sm" radius={999}>
                  <Pressable onPress={() => selectPin(null)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                    <Display s={12} c={C.ink400}>
                      ✕
                    </Display>
                  </Pressable>
                </StickerView>
              </View>
            </StickerView>
          </View>
        ) : null}
      </View>
    </ScreenIn>
  );
}
