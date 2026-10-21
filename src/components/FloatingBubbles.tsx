/**
 * Bubbles that float around a restaurant — its chef, its iconic dishes, its
 * awards, its newness, how many critics have it — each gently bobbing on its
 * own rhythm. Tap the chef to open their profile. Everything comes from the
 * guide (dishes, chef credit, awards) and the critics; the chef's portrait and
 * dish photos are Wikipedia / Commons pictures when there are any.
 *
 * Sits over a cover (pointer events pass through to the cover, except on the
 * bubbles themselves). Reduced motion keeps them still.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing, AccessibilityInfo } from 'react-native';
import { Image } from 'expo-image';
import type { Place } from '../store/data';
import { useStore } from '../store/useStore';
import { chefForPlace } from '../data/chefs';
import { takesForPlace } from '../data/critics';
import { C } from '../theme/tokens';
import { Banner, Mono } from './Text';
import { Monogram } from './Monogram';

type Bubble = { key: string; kind: 'chef' | 'dish' | 'award' | 'new' | 'critics'; label: string; sub?: string; img?: string; onPress?: () => void };

const short = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

/** The bubbles a restaurant earns, most telling first. */
export function useBubbles(place: Place | undefined, max = 5, skip: Bubble['kind'][] = []): Bubble[] {
  const chefPhotos = useStore((s) => s.chefPhotos);
  const platePhotos = useStore((s) => s.platePhotos);
  const ensureChefPhoto = useStore((s) => s.ensureChefPhoto);
  const ensurePlates = useStore((s) => s.ensurePlates);
  const openChef = useStore((s) => s.openChef);
  const chef = chefForPlace(place);
  useEffect(() => {
    if (!place) return;
    if (chef) void ensureChefPhoto(chef);
    void ensurePlates(place);
  }, [place?.id]);
  return useMemo(() => {
    if (!place) return [];
    const out: Bubble[] = [];
    if (chef) out.push({ key: 'chef', kind: 'chef', label: short(chef.name, 22), sub: 'Chef', img: chefPhotos[chef.id]?.url, onPress: () => openChef(chef.id) });
    const plates = platePhotos[place.id] || [];
    // the dishes it's known for (not "whatever's on that day")
    for (const d of (place.dishes || []).filter((x) => !/^(lo que|seg[uú]n|men[uú]|lo del d[ií]a)/i.test(x.trim())).slice(0, 2)) out.push({ key: 'dish:' + d, kind: 'dish', label: short(d), sub: 'Iconic', img: plates.find((x) => x.dish === d)?.img.url });
    const award = (place.awards || '').split(/[·;,]/).map((x) => x.trim()).find(Boolean);
    if (award) out.push({ key: 'award', kind: 'award', label: short(award, 22) });
    if (place.moment === 'Apertura 2026') out.push({ key: 'new', kind: 'new', label: 'New 2026' });
    else if (place.moment === 'En ascenso') out.push({ key: 'new', kind: 'new', label: 'Rising' });
    const n = takesForPlace(place.id).length;
    if (n) out.push({ key: 'critics', kind: 'critics', label: `${n} ${n === 1 ? 'critic' : 'critics'}` });
    return out.filter((b) => !skip.includes(b.kind)).slice(0, max);
  }, [place?.id, chef?.id, chefPhotos, platePhotos, max, skip.join()]);
}

/** Where bubbles sit on the cover, as fractions of its box (left or right anchored). */
const SLOTS: { x: number; y: number; side: 'l' | 'r' }[] = [
  { x: 0.03, y: 0.02, side: 'l' },
  { x: 0.03, y: 0.18, side: 'r' },
  { x: 0.05, y: 0.4, side: 'l' },
  { x: 0.05, y: 0.56, side: 'r' },
  { x: 0.1, y: 0.74, side: 'l' },
];

function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => setStill(!!v))
      .catch(() => {});
  }, []);
  return still;
}

function FloatingBubble({ b, i, still, compact }: { b: Bubble; i: number; still: boolean; compact?: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 2300 + i * 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 2300 + i * 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const start = setTimeout(() => loop.start(), i * 260);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [still]);
  const dy = t.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? -7 : 7] });
  const dx = t.interpolate({ inputRange: [0, 1], outputRange: [0, i % 3 === 0 ? 3 : -3] });
  const rot = ['-4deg', '3deg', '-2deg', '5deg', '-6deg'][i % 5];
  const dot = compact ? 24 : 30;
  const bg = b.kind === 'chef' ? C.paper0 : b.kind === 'dish' ? C.sun100 : b.kind === 'award' ? C.sun400 : b.kind === 'new' ? C.stampGreen : C.ink400;
  const fg = b.kind === 'new' || b.kind === 'critics' ? C.paper0 : C.inkDeep;
  const glyph = b.kind === 'dish' ? '◆' : b.kind === 'award' ? '★' : b.kind === 'new' ? '✦' : '◎';
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingLeft: b.kind === 'chef' || b.img ? 3 : 9, paddingRight: 10, transform: [{ rotate: rot }], shadowColor: C.inkBlack, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }}>
      {b.kind === 'chef' || b.img ? (
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, overflow: 'hidden', borderWidth: 1.5, borderColor: C.inkBlack, backgroundColor: C.ink700, alignItems: 'center', justifyContent: 'center' }}>
          {b.img ? <Image source={{ uri: b.img }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Monogram name={b.label} size={dot} />}
        </View>
      ) : (
        <Banner s={compact ? 9 : 10} c={fg}>
          {glyph}
        </Banner>
      )}
      <View style={{ maxWidth: compact ? 120 : 150 }}>
        {b.sub && !compact ? (
          <Mono s={6.5} c={fg} style={{ opacity: 0.75 }}>
            {b.sub.toUpperCase()}
          </Mono>
        ) : null}
        <Banner s={compact ? 8 : 8.5} tk={0.04} c={fg} numberOfLines={1}>
          {b.label}
        </Banner>
      </View>
    </View>
  );
  return (
    <Animated.View style={{ transform: [{ translateY: dy }, { translateX: dx }] }}>
      {b.onPress ? (
        <Pressable onPress={b.onPress} accessibilityLabel={`${b.sub || ''} ${b.label}`.trim()} hitSlop={6}>
          {body}
        </Pressable>
      ) : (
        <View accessibilityLabel={`${b.sub || b.kind}: ${b.label}`}>{body}</View>
      )}
    </Animated.View>
  );
}

/** The bubbles, floating over whatever cover they're placed on. */
export function FloatingBubbles({ place, max = 5, compact, inset = 0, skip }: { place: Place | undefined; max?: number; compact?: boolean; inset?: number; skip?: Bubble['kind'][] }) {
  const bubbles = useBubbles(place, max, skip);
  const still = useStill();
  const [box, setBox] = useState({ w: 0, h: 0 });
  if (!bubbles.length) return null;
  return (
    <View pointerEvents="box-none" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ position: 'absolute', top: inset, left: 0, right: 0, bottom: 0 }}>
      {box.w
        ? bubbles.map((b, i) => {
            const s = SLOTS[i % SLOTS.length];
            const pos = { top: s.y * box.h, ...(s.side === 'l' ? { left: s.x * box.w } : { right: s.x * box.w }) };
            return (
              <View key={b.key} pointerEvents="box-none" style={{ position: 'absolute', ...pos }}>
                <FloatingBubble b={b} i={i} still={still} compact={compact} />
              </View>
            );
          })
        : null}
    </View>
  );
}
