/**
 * A person as a small pill — avatar, name, one line on why they're here — that
 * opens their profile (yours opens your passport). Used for a chef's fans and
 * supporters, and for a restaurant's supporters.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useStore } from '../store/useStore';
import type { Fan } from '../data/favorites';
import { C, col } from '../theme/tokens';
import { Banner, Mono } from './Text';

export function FanChip({ fan, line, star, quiet }: { fan: Fan; line: string; star?: boolean; quiet?: boolean }) {
  const openFoodie = useStore((s) => s.openFoodie);
  const openMyProfile = useStore((s) => s.openMyProfile);
  return (
    <Pressable
      onPress={() => (fan.kind === 'me' ? openMyProfile() : openFoodie(fan.id))}
      accessibilityLabel={`${quiet ? 'Supporter' : 'Fan'}: ${fan.name}`}
      accessibilityHint="Opens their profile"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: quiet ? 'transparent' : fan.kind === 'me' ? C.sun50 : C.paper0,
        borderWidth: 2,
        borderStyle: quiet ? 'dashed' : 'solid',
        borderColor: quiet ? C.inkSoft : C.inkBlack,
        borderRadius: 999,
        paddingVertical: 4,
        paddingLeft: 4,
        paddingRight: 11,
      }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: col(fan.color), borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: quiet ? 0.85 : 1 }}>
        {fan.avatarUrl ? (
          <Image source={{ uri: fan.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Banner s={8.5} c={C.paper0}>
            {fan.initials}
          </Banner>
        )}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Banner s={9} tk={0.03} c={quiet ? C.inkMuted : C.inkDeep} numberOfLines={1}>
          {fan.name}
          {star ? ' ★' : ''}
        </Banner>
        <Mono s={7} c={C.inkMuted} numberOfLines={1}>
          {line}
        </Mono>
      </View>
    </Pressable>
  );
}
