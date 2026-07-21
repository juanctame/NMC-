/**
 * Nearby map — a brand-native printed-paper map of CDMX (not a Google Maps
 * clone): faint SVG street grid, Reforma/Insurgentes diagonals, park ellipses,
 * rotated neighborhood labels, a pulsing "You" marker, and sticker pins placed
 * by percentage coordinates. Tapping a pin raises a select card.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Ellipse, G } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { EVENTS, RECS, MAP_PTS, EVENT_PHOTO, byId } from '../store/data';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { ScreenIn } from '../components/Anim';

const HOODS: { name: string; x: number; y: number; rot: string; strong?: boolean }[] = [
  { name: 'Centro', x: 72, y: 14, rot: '-3deg' },
  { name: 'Juárez', x: 50, y: 29, rot: '-2deg' },
  { name: 'Polanco', x: 22, y: 15, rot: '2deg' },
  { name: 'Roma Nte', x: 57, y: 38, rot: '-2deg', strong: true },
  { name: 'Condesa', x: 33, y: 62, rot: '3deg', strong: true },
  { name: 'Narvarte', x: 70, y: 82, rot: '-2deg' },
];

type Pin = { kind: string; id: string; x: number; y: number; walk: string; metric: string; bg: string; fg: string; dashed: boolean };

export function NearbyMap() {
  const insets = useSafeAreaInsets();
  const closeMap = useStore((s) => s.closeMap);
  const mapFilter = useStore((s) => s.mapFilter);
  const setMapFilter = useStore((s) => s.setMapFilter);
  const selPin = useStore((s) => s.selPin);
  const selectPin = useStore((s) => s.selectPin);
  const openEvent = useStore((s) => s.openEvent);
  const openPlace = useStore((s) => s.openPlace);
  const ranked = useStore((s) => s.ranked);

  const rankPos: Record<string, number> = {};
  ranked.forEach((r, i) => {
    rankPos[r.id] = i + 1;
  });

  const pins: Pin[] = [];
  EVENTS.forEach((ev) => {
    const pt = MAP_PTS[ev.id];
    if (pt) pins.push({ kind: 'event', id: ev.id, x: pt.x, y: pt.y, walk: pt.walk, metric: ev.d, bg: C.sun400, fg: C.inkDeep, dashed: false });
  });
  ranked.forEach((r) => {
    const pt = MAP_PTS[r.id];
    if (pt) {
      const ss = scoreStyle(r.score!);
      pins.push({ kind: 'spot', id: r.id, x: pt.x, y: pt.y, walk: pt.walk, metric: fmt(r.score!), bg: ss.bg, fg: ss.fg, dashed: true });
    }
  });
  RECS.forEach((rc) => {
    const pt = MAP_PTS[rc.placeId];
    if (pt) pins.push({ kind: 'rec', id: rc.placeId, x: pt.x, y: pt.y, walk: pt.walk, metric: rc.match.replace('%', ''), bg: C.ink400, fg: C.paper0, dashed: false });
  });

  const shown = pins.filter((p) => mapFilter === 'all' || p.kind === mapFilter);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'event', label: 'Events' },
    { key: 'spot', label: 'Your spots' },
    { key: 'rec', label: 'Recs' },
  ];

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
          <View style={{ flex: 1 }}>
            <Display s={24} c={C.inkDeep}>
              Nearby
            </Display>
            <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
              Roma · Condesa · CDMX · 24°C, sun
            </Mono>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 2 }}>
          {filters.map((f) => {
            const on = mapFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setMapFilter(f.key as any)}
                style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: on ? C.ink400 : C.paper0 }}
              >
                <Banner s={10} tk={0.12} c={on ? C.paper0 : C.inkDeep}>
                  {f.label}
                </Banner>
              </Pressable>
            );
          })}
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

        {/* neighborhood labels */}
        {HOODS.map((h) => (
          <View key={h.name} pointerEvents="none" style={{ position: 'absolute', left: `${h.x}%`, top: `${h.y}%`, transform: [{ translateX: -28 }, { translateY: -8 }, { rotate: h.rot }] }}>
            <Banner s={h.strong ? 11 : 10} tk={0.17} c={h.strong ? C.inkMuted : C.inkSoft} style={{ width: 90, textAlign: 'center' }}>
              {h.name}
            </Banner>
          </View>
        ))}

        {/* You marker */}
        <View pointerEvents="none" style={{ position: 'absolute', left: '52%', top: '52%', marginLeft: -22, marginTop: -22, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(216,80,26,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.ink400, borderWidth: 2.5, borderColor: C.paper0 }} />
          </View>
          <View style={{ marginTop: 2, backgroundColor: C.paper0, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 7 }}>
            <Banner s={8} tk={0.14} c={C.ink400}>
              You
            </Banner>
          </View>
        </View>

        {/* pins */}
        {shown.map((p) => {
          const isSel = !!selPin && selPin.kind === p.kind && selPin.id === p.id;
          const size = isSel ? 42 : p.kind === 'event' ? 38 : 34;
          return (
            <View key={p.kind + p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, marginLeft: -size / 2, marginTop: -size / 2, zIndex: isSel ? 30 : p.kind === 'event' ? 14 : 12 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Pressable
                  onPress={() => selectPin({ kind: p.kind, id: p.id })}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: p.bg,
                    borderWidth: 2.5,
                    borderColor: C.inkBlack,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.dashed ? (
                    <View pointerEvents="none" style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: size / 2, borderWidth: 2, borderColor: p.fg, borderStyle: 'dashed' }} />
                  ) : null}
                  <Display s={12} c={p.fg}>
                    {p.metric}
                  </Display>
                </Pressable>
              </StickerView>
            </View>
          );
        })}

        {/* legend */}
        <View style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 5 }}>
          <StickerView offset="sm" style={{ flexDirection: 'row', gap: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 7, paddingHorizontal: 11 }}>
            {[
              { c: C.sun400, l: 'Events' },
              { c: C.stampGreen, l: 'Spots' },
              { c: C.ink400, l: 'Recs' },
            ].map((x) => (
              <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: x.c, borderWidth: 1.5, borderColor: C.inkBlack }} />
                <Mono s={9} c={C.inkMuted}>
                  {x.l}
                </Mono>
              </View>
            ))}
          </StickerView>
        </View>

        {/* select card */}
        {selPin ? <SelectCard rankPos={rankPos} onEvent={openEvent} onPlace={openPlace} onClose={() => selectPin(null)} /> : null}
      </View>
    </ScreenIn>
  );
}

function SelectCard({
  rankPos,
  onEvent,
  onPlace,
  onClose,
}: {
  rankPos: Record<string, number>;
  onEvent: (id: string) => void;
  onPlace: (id: string) => void;
  onClose: () => void;
}) {
  const sel = useStore((s) => s.selPin)!;
  const ranked = useStore((s) => s.ranked);
  const pt = MAP_PTS[sel.id] || { walk: '' };

  let content: { photo: string; name: string; meta: string; badge: string; badgeBg: string; badgeFg: string; walk: string; cta: string; onPress: () => void };
  if (sel.kind === 'event') {
    const ev = EVENTS.find((e) => e.id === sel.id)!;
    const left = ev.spots - ev.taken;
    content = {
      photo: EVENT_PHOTO[ev.id],
      name: ev.title,
      meta: `${ev.wd} ${ev.mo} ${ev.d} · ${ev.route}`,
      badge: left <= 0 ? 'Full · waitlist' : `${left} spots left`,
      badgeBg: left <= 0 ? C.stampPink : C.sun400,
      badgeFg: left <= 0 ? C.pinkFg : C.inkDeep,
      walk: pt.walk,
      cta: 'See event →',
      onPress: () => onEvent(ev.id),
    };
  } else {
    const base = byId[sel.id];
    const rr = ranked.find((r) => r.id === sel.id);
    const ss = rr ? scoreStyle(rr.score!) : { bg: C.ink400, fg: C.paper0 };
    const rc = RECS.find((x) => x.placeId === sel.id);
    content = {
      photo: base.photo,
      name: base.name,
      meta: metaOf(base),
      badge: sel.kind === 'spot' ? `Nº ${rankPos[sel.id]} · ${fmt(rr!.score!)}` : rc ? `${rc.match} match` : 'Recommended',
      badgeBg: sel.kind === 'spot' ? ss.bg : C.ink400,
      badgeFg: sel.kind === 'spot' ? ss.fg : C.paper0,
      walk: pt.walk,
      cta: 'See place →',
      onPress: () => onPlace(sel.id),
    };
  }

  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 25 }}>
      <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
        <Photo source={photo(content.photo)} style={{ width: 56, height: 56, borderWidth: 2, borderColor: C.inkBlack }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <SerifDisplay s={16} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 16 }}>
            {content.name}
          </SerifDisplay>
          <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
            {content.meta}
          </Mono>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: content.badgeBg }}>
              <Banner s={9} tk={0.08} c={content.badgeFg}>
                {content.badge}
              </Banner>
            </View>
            <Mono s={9} c={C.inkSoft}>
              {content.walk}
            </Mono>
          </View>
        </View>
        <StickerPressable offset="sm" radius={999} onPress={content.onPress} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 12 }}>
          <Banner s={10} tk={0.1} c={C.paper0}>
            {content.cta}
          </Banner>
        </StickerPressable>
        <View style={{ position: 'absolute', top: -10, right: -8 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={onClose} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={12} c={C.ink400}>
                ✕
              </Display>
            </Pressable>
          </StickerView>
        </View>
      </StickerView>
    </View>
  );
}
