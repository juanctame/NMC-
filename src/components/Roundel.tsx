/**
 * Circular passport-stamp roundel — the app's most repeated motif (score
 * roundels, RT seals, avatars, map pins). Supports the dashed inner ring the
 * design draws with `outline` + negative `outline-offset`.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Display } from './Text';
import { C } from '../theme/tokens';

export function Roundel({
  size,
  bg,
  fg,
  text,
  textSize,
  rot,
  border = 2.5,
  dashInset,
  style,
  children,
}: {
  size: number;
  bg: string;
  fg: string;
  text?: string;
  textSize?: number;
  rot?: string;
  border?: number;
  dashInset?: number; // distance the dashed ring sits inside the edge
  style?: ViewStyle;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: border,
          borderColor: C.inkBlack,
          alignItems: 'center',
          justifyContent: 'center',
          ...(rot ? { transform: [{ rotate: rot }] } : null),
        },
        style,
      ]}
    >
      {dashInset != null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dashInset,
            left: dashInset,
            right: dashInset,
            bottom: dashInset,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: fg,
            borderStyle: 'dashed',
          }}
        />
      ) : null}
      {children ??
        (text != null ? (
          <Display s={textSize ?? Math.round(size * 0.32)} c={fg}>
            {text}
          </Display>
        ) : null)}
    </View>
  );
}
