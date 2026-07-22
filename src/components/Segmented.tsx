/**
 * Underline segmented control (Log: Been/Want/Recs, Table & Club: Events/
 * Community). Each segment is a tab-style button with a 3px bottom border that
 * tints to the active accent.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Banner } from './Text';

export type Seg = { key: string; label: string };

export function Segmented({
  items,
  value,
  onChange,
  activeFg,
  inactiveFg,
  activeBorder,
  containerBorderColor,
}: {
  items: Seg[];
  value: string;
  onChange: (key: string) => void;
  activeFg: string;
  inactiveFg: string;
  activeBorder: string;
  containerBorderColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        ...(containerBorderColor ? { borderBottomWidth: 2, borderBottomColor: containerBorderColor } : null),
      }}
    >
      {items.map((it) => {
        const on = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 4,
              borderBottomWidth: 3,
              borderBottomColor: on ? activeBorder : 'transparent',
              alignItems: 'center',
            }}
          >
            <Banner s={11} tk={0.1} c={on ? activeFg : inactiveFg}>
              {it.label}
            </Banner>
          </Pressable>
        );
      })}
    </View>
  );
}
