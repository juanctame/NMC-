/**
 * Persistent bottom tab bar: Corner · Guide · ⊕ Rank · Table · You. The center
 * Rank button protrudes above the bar and opens the rank flow. Active tab tints
 * vermillion, inactive stays soft ink.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { C } from '../theme/tokens';
import { Banner } from './Text';
import { StickerView } from './Sticker';
import { TabFeed, TabGuide, TabTable, TabYou, PlusIcon } from './icons';

function TabButton({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  children: (color: string) => React.ReactNode;
}) {
  const color = active ? C.ink400 : C.inkSoft;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      {children(color)}
      <Banner s={8} tk={0.08} c={color}>
        {label}
      </Banner>
    </Pressable>
  );
}

export function TabBar() {
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const screen = useStore((s) => s.screen);
  const go = useStore((s) => s.go);
  const startRank = useStore((s) => s.startRank);
  const t = useT();

  const isActive = (tt: string) => tab === tt && screen === tt;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        backgroundColor: C.paper0,
        borderTopWidth: 2.5,
        borderTopColor: C.inkBlack,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 9,
        paddingHorizontal: 8,
        paddingBottom: Math.max(insets.bottom, 12) + 8,
      }}
    >
      <TabButton active={isActive('feed')} label="CRTQ" onPress={() => go('feed')}>
        {(color) => <TabFeed color={color} />}
      </TabButton>
      <TabButton active={isActive('log')} label={t('nav.guide')} onPress={() => go('log')}>
        {(color) => <TabGuide color={color} />}
      </TabButton>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <StickerView offset="sm" radius={999} style={{ marginTop: -20 }}>
          <Pressable
            onPress={() => startRank(null)}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: C.ink400,
              borderWidth: 2.5,
              borderColor: C.inkBlack,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-4deg' }],
            }}
          >
            <PlusIcon size={26} color={C.paper0} sw={2.6} />
          </Pressable>
        </StickerView>
      </View>

      <TabButton active={isActive('table')} label={t('nav.table')} onPress={() => go('table')}>
        {(color) => <TabTable color={color} />}
      </TabButton>
      <TabButton active={isActive('you')} label={t('nav.you')} onPress={() => go('you')}>
        {(color) => <TabYou color={color} />}
      </TabButton>
    </View>
  );
}
