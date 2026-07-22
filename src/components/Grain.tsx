/**
 * Paper-grain overlay. Reproduces `assets/pattern-paper.svg` (fractal-noise
 * turbulence tinted warm ink) at 5–9% opacity over large colour fields. Renders
 * inside react-native-svg; if a platform ignores the filter it simply stays
 * invisible, which is acceptable at this opacity.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';

export function Grain({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Filter id="grain" x="0" y="0" width="100%" height="100%">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
            <FeColorMatrix
              values="0 0 0 0 0.16  0 0 0 0 0.10  0 0 0 0 0.02  0 0 0 0.35 0"
            />
          </Filter>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" filter="url(#grain)" />
      </Svg>
    </View>
  );
}
