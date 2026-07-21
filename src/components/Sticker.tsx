/**
 * The signature "sticker" offset shadow. Rendered as a solid offset layer
 * behind the content (a hard printed offset that native elevation/shadowRadius
 * cannot reproduce on Android). On press the content translates by the offset
 * and the shadow collapses — the prototype's `:active` behaviour.
 *
 * Pass `radius={999}` for pills/circles (RN clamps to a circle on square boxes)
 * and the default `0` for crisp rectangles.
 */
import React, { useState } from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { STICKER } from '../theme/tokens';

type Offset = 'sm' | 'lg' | 'none';

function shadowLayer(offset: Offset, radius: number): React.ReactNode {
  if (offset === 'none') return null;
  const { dx, dy, color } = STICKER[offset];
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: dx,
        top: dy,
        right: -dx,
        bottom: -dy,
        borderRadius: radius,
        backgroundColor: color,
      }}
    />
  );
}

export function StickerView({
  offset = 'sm',
  radius = 0,
  style,
  children,
  ...rest
}: ViewProps & { offset?: Offset; radius?: number; style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={{ position: 'relative' }} {...rest}>
      {shadowLayer(offset, radius)}
      <View style={style}>{children}</View>
    </View>
  );
}

export function StickerPressable({
  offset = 'sm',
  radius = 0,
  style,
  children,
  onPress,
  disabled,
  pressColor,
  ...rest
}: PressableProps & {
  offset?: Offset;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  pressColor?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const { dx, dy } = offset === 'none' ? { dx: 2, dy: 2 } : STICKER[offset];
  const showShadow = offset !== 'none' && !pressed;

  return (
    <View style={{ position: 'relative' }}>
      {showShadow ? shadowLayer(offset, radius) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          style,
          pressed ? { transform: [{ translateX: dx }, { translateY: dy }] } : null,
          pressed && pressColor ? { backgroundColor: pressColor } : null,
        ]}
        {...rest}
      >
        {children as React.ReactNode}
      </Pressable>
    </View>
  );
}
