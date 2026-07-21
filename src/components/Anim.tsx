/**
 * Motion helpers built on the core Animated API (no reanimated dependency, to
 * keep the native build robust). Durations/curves match the design system:
 * screenIn (fade + 6px rise), stampIn (rotate + scale press), sheetUp (bottom
 * sheet slide), slowZoom (12s ken-burns on the reel).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

const easeOut = Easing.bezier(0.2, 0.7, 0.2, 1);
const easePress = Easing.bezier(0.3, 0, 0.5, 1);

export function ScreenIn({
  children,
  style,
  duration = 380,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  duration?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, easing: easeOut, useNativeDriver: true }).start();
  }, [v, duration]);
  return (
    <Animated.View
      style={[
        { flex: 1 },
        style as ViewStyle,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** stampIn: opacity + rotate(-13deg) + scale 2.3 → 0.9 → 1. */
export function StampIn({
  children,
  style,
  rotate = '-13deg',
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  rotate?: string;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(v, { toValue: 0.55, duration: 280, easing: easePress, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 240, easing: easeOut, useNativeDriver: true }),
    ]).start();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [2.3, 0.9, 1] });
  const opacity = v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] });
  return (
    <Animated.View style={[style as ViewStyle, { opacity, transform: [{ rotate }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

/** sheetUp: slide a bottom sheet up from off-screen. */
export function SheetUp({
  children,
  style,
  distance = 600,
  duration = 240,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  distance?: number;
  duration?: number;
}) {
  const v = useRef(new Animated.Value(distance)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 0, duration, easing: easeOut, useNativeDriver: true }).start();
  }, [v, duration]);
  return <Animated.View style={[style as ViewStyle, { transform: [{ translateY: v }] }]}>{children}</Animated.View>;
}

/** slowZoom: 12s ken-burns scale loop, stand-in for the trending video. */
export function useSlowZoom() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
}
