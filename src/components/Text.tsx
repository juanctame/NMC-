/**
 * Typography primitives. Each variant bakes in its font family (a specific
 * weight face) and, where the design calls for it, uppercase transform.
 *
 * Props:
 *   s  — font size (px)
 *   tk — tracking in em (converted to points as tk * s to match the CSS spec)
 *   c  — color
 */
import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { FONTS } from '../theme/fonts';
import { C } from '../theme/tokens';

type Props = TextProps & {
  s?: number;
  tk?: number;
  c?: string;
  style?: TextStyle | TextStyle[];
  children?: React.ReactNode;
};

function make(family: string, base: TextStyle) {
  return function Variant({ s, tk, c, style, children, ...rest }: Props) {
    const composed: TextStyle = {
      fontFamily: family,
      ...base,
      ...(s != null ? { fontSize: s } : null),
      ...(tk != null ? { letterSpacing: tk * (s ?? (base.fontSize as number) ?? 14) } : null),
      ...(c ? { color: c } : null),
    };
    return (
      <RNText allowFontScaling={false} style={[composed, style as TextStyle]} {...rest}>
        {children}
      </RNText>
    );
  };
}

/** Megazoid slab display — screen titles, scores, wordmark. Always uppercase. */
export const Display = make(FONTS.display, {
  color: C.inkDeep,
  textTransform: 'uppercase',
});

export const DisplayItalic = make(FONTS.displayItalic, {
  color: C.inkDeep,
  textTransform: 'uppercase',
});

/** DM Serif Display — card / place / event titles. */
export const SerifDisplay = make(FONTS.serifDisplay, { color: C.inkDeep });

/** Fraunces — body copy, captions, blurbs. */
export const Serif = make(FONTS.serif, { color: C.inkBlack });
export const SerifItalic = make(FONTS.serifItalic, { color: C.inkMuted });

/** Roquen — the all-caps banner face: eyebrows, labels, buttons, chips, badges. */
export const Banner = make(FONTS.banner, {
  color: C.inkDeep,
  textTransform: 'uppercase',
});

/** JetBrains Mono — meta lines, timestamps, coordinates, codes, prices. */
export const Mono = make(FONTS.mono, { color: C.inkMuted });

/** Space Grotesk — neutral UI sans. */
export const Sans = make(FONTS.sans, { color: C.inkBlack });
