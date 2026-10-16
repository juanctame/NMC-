/**
 * The quiet way into "Can't decide?": a small sticker in the corner of the
 * browsing sections (feed, guide, leaderboard, tables). It pops in a moment
 * after you land on a section, says "Can't decide?" for a few seconds, then
 * folds down to a little card-fan button. Once you've picked today's table it
 * carries a green check (and says which table when it unfolds).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { today } from '../data/decide';
import { C } from '../theme/tokens';
import { Banner, SerifDisplay } from './Text';
import { StickerPressable } from './Sticker';

const TAB_BAR = 66; // the tab bar's height above the safe area (TabBar.tsx)

/** Two tilted mini cards — ✕ behind, ✓ in front. */
function MiniFan() {
  return (
    <View style={{ width: 26, height: 24 }}>
      <View style={{ position: 'absolute', left: 1, top: 2, width: 14, height: 20, backgroundColor: C.paper0, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-14deg' }] }}>
        <SerifDisplay s={9} c={C.ink400} style={{ lineHeight: 10 }}>
          ✕
        </SerifDisplay>
      </View>
      <View style={{ position: 'absolute', left: 10, top: 1, width: 14, height: 20, backgroundColor: C.stampGreen, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }] }}>
        <SerifDisplay s={9} c={C.paper0} style={{ lineHeight: 10 }}>
          ✓
        </SerifDisplay>
      </View>
    </View>
  );
}

export function DecideFab() {
  const insets = useSafeAreaInsets();
  const screen = useStore((s) => s.screen);
  const openDecide = useStore((s) => s.openDecide);
  const pick = useStore((s) => (s.decide.day === today() ? s.decide.pick : null));
  const nearbyById = useStore((s) => s.nearbyById);
  const picked = pick ? resolvePlace(pick, nearbyById) : undefined;
  const [open, setOpen] = useState(true);
  const appear = useRef(new Animated.Value(0)).current;

  // Each time you land on a section: pop in, introduce itself, then fold away.
  useEffect(() => {
    appear.setValue(0);
    setOpen(true);
    const pop = Animated.timing(appear, { toValue: 1, duration: 320, delay: 700, easing: Easing.out(Easing.back(1.6)), useNativeDriver: false });
    pop.start();
    const fold = setTimeout(() => setOpen(false), 4200);
    return () => {
      pop.stop();
      clearTimeout(fold);
    };
  }, [screen, appear]);

  const label = picked ? `Today: ${picked.name}` : "Can't decide?";
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 14,
        bottom: Math.max(insets.bottom, 12) + TAB_BAR + 14,
        zIndex: 29,
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { rotate: '-3deg' }],
      }}
    >
      <StickerPressable
        offset="sm"
        radius={999}
        onPress={openDecide}
        accessibilityLabel={picked ? `Can't decide? Today's table: ${picked.name}` : "Can't decide?"}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 46, minWidth: 46, borderRadius: 23, backgroundColor: C.sun400, borderWidth: 2.5, borderColor: C.inkBlack, paddingLeft: 9, paddingRight: open ? 13 : 9 }}
      >
        <MiniFan />
        {open ? (
          <Banner s={9.5} tk={0.08} c={C.inkDeep} numberOfLines={1} style={{ maxWidth: 170 }}>
            {label}
          </Banner>
        ) : null}
        {picked ? (
          <View style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <SerifDisplay s={9} c={C.paper0} style={{ lineHeight: 10 }}>
              ✓
            </SerifDisplay>
          </View>
        ) : null}
      </StickerPressable>
    </Animated.View>
  );
}
