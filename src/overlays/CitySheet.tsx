/**
 * City picker. Choosing a city re-queries the provider for what's good to eat
 * near it — the app updates constantly with real places per selected city.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CITIES } from '../data/cities';
import { C } from '../theme/tokens';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

export function CitySheet() {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeCitySheet);
  const setCity = useStore((s) => s.setCity);
  const currentId = useStore((s) => s.city.id);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55 }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.55)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ maxHeight: '86%', backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Display s={24} c={C.inkDeep}>
              Choose your city
            </Display>
            <Pressable onPress={close}>
              <Mono s={12} c={C.inkMuted}>
                Close ✕
              </Mono>
            </Pressable>
          </View>
          <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 3, marginBottom: 16 }}>
            We'll pull what's good to eat near it, right now.
          </SerifItalic>

          <View style={{ gap: 10 }}>
            {CITIES.map((c) => {
              const on = c.id === currentId;
              return (
                <StickerPressable
                  key={c.id}
                  offset="sm"
                  onPress={() => setCity(c.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: on ? C.sun400 : C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 11, paddingHorizontal: 13 }}
                >
                  <Display s={22}>{c.flag}</Display>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <SerifDisplay s={17} c={C.inkDeep} style={{ lineHeight: 18 }}>
                      {c.name}
                    </SerifDisplay>
                    <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                      {c.country} · {c.defaultHood}
                    </Mono>
                  </View>
                  {on ? (
                    <Display s={18} c={C.ink400}>
                      ✓
                    </Display>
                  ) : (
                    <Banner s={9} tk={0.1} c={C.inkSoft}>
                      Go →
                    </Banner>
                  )}
                </StickerPressable>
              );
            })}
          </View>
          <Mono s={10} c={C.inkSoft} style={{ textAlign: 'center', marginTop: 16 }}>
            Live places from OpenStreetMap · more cities as we grow
          </Mono>
        </SheetUp>
      </View>
    </View>
  );
}
