/**
 * Onboarding — first-run intro. Cover → taste picker (pick ≥3) → house rules,
 * ending with a circular green ADMITTED stamp that routes into the Feed.
 */
import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { C } from '../theme/tokens';
import { BRAND } from '../assets';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Roundel } from '../components/Roundel';
import { Grain } from '../components/Grain';
import { StampIn } from '../components/Anim';

const TASTES = [
  'Tacos al pastor',
  'Mole',
  'Mariscos',
  'Street food',
  'Vegetariano',
  'Mezcal',
  'Café de olla',
  'Panaderías',
  'Cantinas',
  'Antojitos',
  'Natural wine',
  'Fine dining',
];

const RULES = [
  'Be generous — real recs, real photos, real addresses.',
  'Be kind — no hate, no spam, no creeps at the table.',
  'Show up — hosts hold your seat. Honor it.',
];

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const obStep = useStore((s) => s.obStep);
  const tastes = useStore((s) => s.tastes);
  const stamped = useStore((s) => s.stamped);
  const obNext = useStore((s) => s.obNext);
  const obSkip = useStore((s) => s.obSkip);
  const toggleTaste = useStore((s) => s.toggleTaste);
  const stampMe = useStore((s) => s.stampMe);

  const needTaste = Math.max(0, 3 - tastes.length);

  // Step 0 — cover
  if (obStep === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sun400 }}>
        <Grain opacity={0.06} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 30 }}>
          <Image source={BRAND.logo} style={{ width: 138, height: 138, transform: [{ rotate: '-6deg' }] }} resizeMode="contain" />
          <Banner s={11} tk={0.22} c={C.ink500} style={{ textAlign: 'center' }}>
            Around the world · around the table
          </Banner>
          <Display s={46} c={C.inkDeep} style={{ textAlign: 'center', lineHeight: 42 }}>
            NO MAD{'\n'}CORNER
          </Display>
          <Serif s={16} style={{ textAlign: 'center', maxWidth: 282, lineHeight: 25 }}>
            Rank every place you eat, keep a passport of your city, and find your next table through the friends you actually trust.
          </Serif>
          <StickerPressable offset="sm" radius={999} onPress={obNext} style={{ marginTop: 6, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 14, paddingHorizontal: 30 }}>
            <Banner s={14} tk={0.1} c={C.paper0}>
              Start stamping →
            </Banner>
          </StickerPressable>
          <Pressable onPress={obSkip}>
            <Mono s={11} c={C.ink600} style={{ textDecorationLine: 'underline' }}>
              I’ve been here before — skip
            </Mono>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Step 1 — taste picker
  if (obStep === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper50 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
          <Banner s={11} tk={0.16} c={C.ink400}>
            Step 1 of 2
          </Banner>
          <Display s={32} c={C.inkDeep} style={{ marginTop: 8, lineHeight: 32 }}>
            What do you chase?
          </Display>
          <Serif s={14} c={C.inkMuted} style={{ marginTop: 10, marginBottom: 20 }}>
            Pick three or more. Your recs learn from here.
          </Serif>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {TASTES.map((name) => {
              const on = tastes.includes(name);
              return on ? (
                <StickerView key={name} offset="sm" radius={999} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 9, paddingHorizontal: 14 }}>
                  <Pressable onPress={() => toggleTaste(name)}>
                    <Banner s={11} tk={0.1} c={C.inkDeep}>
                      {name}
                    </Banner>
                  </Pressable>
                </StickerView>
              ) : (
                <Pressable key={name} onPress={() => toggleTaste(name)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 9, paddingHorizontal: 14 }}>
                  <Banner s={11} tk={0.1} c={C.inkDeep}>
                    {name}
                  </Banner>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1, minHeight: 20 }} />
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => (needTaste > 0 ? undefined : obNext())}
            disabled={needTaste > 0}
            style={{ marginTop: 20, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 14, opacity: needTaste > 0 ? 0.45 : 1 }}
          >
            <Banner s={14} tk={0.1} c={C.paper0}>
              {needTaste > 0 ? `Pick ${needTaste} more` : 'That’s my table →'}
            </Banner>
          </StickerPressable>
        </ScrollView>
      </View>
    );
  }

  // Step 2 — house rules
  return (
    <View style={{ flex: 1, backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        <Banner s={11} tk={0.16} c={C.ink400}>
          Step 2 of 2
        </Banner>
        <Display s={32} c={C.inkDeep} style={{ marginTop: 8, lineHeight: 32 }}>
          House rules
        </Display>
        <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, marginTop: 18, gap: 12 }}>
          {RULES.map((r, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: 'rgba(42,26,6,0.2)' }} /> : null}
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Display s={20} c={C.ink400}>
                  {i + 1}
                </Display>
                <Serif s={14.5} style={{ flex: 1, lineHeight: 22 }}>
                  {r}
                </Serif>
              </View>
            </React.Fragment>
          ))}
        </StickerView>
        <Mono s={11} c={C.inkMuted} style={{ marginTop: 16, lineHeight: 18 }}>
          Every table has a named, verified host and a guest list. Report anything off — we read every flag.
        </Mono>
        <View style={{ flex: 1, minHeight: 20 }} />
        <StickerPressable offset="sm" radius={999} onPress={stampMe} style={{ marginTop: 20, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.stampGreen, paddingVertical: 14 }}>
          <Banner s={14} tk={0.1} c={C.paper0}>
            Stamp me in
          </Banner>
        </StickerPressable>
      </ScrollView>

      {stamped ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <StampIn>
            <Roundel size={148} bg={C.stampGreen} fg={C.greenFg} border={3} dashInset={10}>
              <Banner s={15} tk={0.14} c={C.greenFg} style={{ textAlign: 'center', lineHeight: 18 }}>
                Admitted{'\n'}Nº 4,102
              </Banner>
            </Roundel>
          </StampIn>
        </View>
      ) : null}
    </View>
  );
}
