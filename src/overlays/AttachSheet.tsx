/**
 * Attach sheet — the composer's app picker. Selecting an app inserts its card
 * (or a photo note) into the active thread.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { APPS } from '../store/data';
import { C, col } from '../theme/tokens';
import { Display, Banner } from '../components/Text';
import { StickerView } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

export function AttachSheet() {
  const insets = useSafeAreaInsets();
  const closeAttach = useStore((s) => s.closeAttach);
  const insertApp = useStore((s) => s.insertApp);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55 }}>
      <Pressable onPress={closeAttach} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.55)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 20 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 14 }}>
            Bring to the table
          </Banner>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {APPS.map((a) => (
              <Pressable key={a.name} onPress={() => insertApp(a)} style={{ width: '33.3%', alignItems: 'center', gap: 7, paddingVertical: 10 }}>
                <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: a.rot }] }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: col(a.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                    <Display s={19} c={col(a.fg)}>
                      {a.glyph}
                    </Display>
                  </View>
                </StickerView>
                <Banner s={9} tk={0.1} c={C.inkDeep} style={{ textAlign: 'center' }}>
                  {a.name}
                </Banner>
              </Pressable>
            ))}
          </View>
        </SheetUp>
      </View>
    </View>
  );
}
