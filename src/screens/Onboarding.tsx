/**
 * Onboarding — first-run intro that creates the user's account. Cover → create
 * account (name / handle / home city / stamp colour) → taste picker (pick ≥3) →
 * house rules, ending with a green ADMITTED stamp carrying the new passport №,
 * then into the Feed. The account persists locally, so returning testers skip
 * straight to the app.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CITIES } from '../data/cities';
import { TASTE_CUISINES } from '../data/cuisines';
import { AVATAR_COLORS, initialsOf, suggestHandle } from '../data/profile';
import { C, col } from '../theme/tokens';
import { BRAND } from '../assets';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Roundel } from '../components/Roundel';
import { Grain } from '../components/Grain';
import { StampIn } from '../components/Anim';

const TASTES = TASTE_CUISINES;

const RULES = [
  'Be generous — real recs, real photos, real addresses.',
  'Be kind — no hate, no spam, no creeps at the table.',
  'Show up — hosts hold your seat. Honor it.',
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 8 }}>
        {label}
      </Banner>
      {children}
    </View>
  );
}

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const obStep = useStore((s) => s.obStep);
  const tastes = useStore((s) => s.tastes);
  const stamped = useStore((s) => s.stamped);
  const profile = useStore((s) => s.profile);
  const obNext = useStore((s) => s.obNext);
  const obSkip = useStore((s) => s.obSkip);
  const toggleTaste = useStore((s) => s.toggleTaste);
  const stampMe = useStore((s) => s.stampMe);
  const createProfile = useStore((s) => s.createProfile);

  // Account draft (kept in local state across the step switch).
  const [name, setName] = useState('');
  const [handleRaw, setHandleRaw] = useState('');
  const [handleEdited, setHandleEdited] = useState(false);
  const [cityId, setCityId] = useState('cdmx');
  const [colorIdx, setColorIdx] = useState(0);

  const handleVal = handleEdited ? handleRaw : suggestHandle(name);
  const initials = initialsOf(name || '');
  const avatarColor = AVATAR_COLORS[colorIdx];
  const needTaste = Math.max(0, 3 - tastes.length);

  const submit = () => {
    createProfile({ name, handle: handleVal, cityId, color: avatarColor });
    stampMe();
  };

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
          <Display s={88} c={C.inkDeep} style={{ textAlign: 'center', lineHeight: 82 }}>
            CRTQ
          </Display>
          <Serif s={16} style={{ textAlign: 'center', maxWidth: 282, lineHeight: 25 }}>
            Rank every place you eat, keep a passport of your city, and find your next table through the friends you actually trust.
          </Serif>
          <StickerPressable offset="sm" radius={999} onPress={obNext} style={{ marginTop: 6, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 14, paddingHorizontal: 30 }}>
            <Banner s={14} tk={0.1} c={C.paper0}>
              Create my passport →
            </Banner>
          </StickerPressable>
          <Pressable onPress={obSkip}>
            <Mono s={11} c={C.ink600} style={{ textDecorationLine: 'underline' }}>
              Just let me look around
            </Mono>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Step 1 — create account
  if (obStep === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper50 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Banner s={11} tk={0.16} c={C.ink400}>
            Step 1 of 3
          </Banner>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: col(avatarColor), borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Banner s={20} c={C.paper0}>
                  {initials}
                </Banner>
              </View>
            </StickerView>
            <View style={{ flex: 1 }}>
              <Display s={28} c={C.inkDeep} style={{ lineHeight: 27 }}>
                Create your account
              </Display>
            </View>
          </View>
          <Serif s={13.5} c={C.inkMuted} style={{ marginTop: 8 }}>
            Your passport to the table. No password for the pilot — just tell us who you are.
          </Serif>

          <Field label="Your name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. June Ozawa"
              placeholderTextColor={C.inkSoft}
              autoCapitalize="words"
              style={inputStyle}
            />
          </Field>
          <Field label="Handle">
            <TextInput
              value={handleVal}
              onChangeText={(t) => {
                setHandleEdited(true);
                setHandleRaw(t.startsWith('@') ? t : '@' + t);
              }}
              placeholder="@you"
              placeholderTextColor={C.inkSoft}
              autoCapitalize="none"
              style={inputStyle}
            />
          </Field>
          <Field label="Home city">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CITIES.map((c) => {
                const on = cityId === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setCityId(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: on ? C.sun400 : C.paper0 }}>
                    <Display s={13}>{c.flag}</Display>
                    <Banner s={10} tk={0.08} c={C.inkDeep}>
                      {c.name}
                    </Banner>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Your stamp color">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {AVATAR_COLORS.map((c, i) => {
                const on = colorIdx === i;
                return (
                  <Pressable key={c} onPress={() => setColorIdx(i)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: col(c), borderWidth: on ? 3.5 : 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? (
                      <Display s={16} c={C.paper0}>
                        ✓
                      </Display>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <View style={{ flex: 1, minHeight: 24 }} />
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => (name.trim() ? obNext() : undefined)}
            disabled={!name.trim()}
            style={{ marginTop: 24, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 14, opacity: name.trim() ? 1 : 0.45 }}
          >
            <Banner s={14} tk={0.1} c={C.paper0}>
              {name.trim() ? 'Continue →' : 'Add your name'}
            </Banner>
          </StickerPressable>
        </ScrollView>
      </View>
    );
  }

  // Step 2 — taste picker
  if (obStep === 2) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper50 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
          <Banner s={11} tk={0.16} c={C.ink400}>
            Step 2 of 3
          </Banner>
          <Display s={32} c={C.inkDeep} style={{ marginTop: 8, lineHeight: 32 }}>
            What do you chase?
          </Display>
          <Serif s={14} c={C.inkMuted} style={{ marginTop: 10, marginBottom: 20 }}>
            Pick three or more. Your recs learn from here.
          </Serif>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {TASTES.map((tName) => {
              const on = tastes.includes(tName);
              return on ? (
                <StickerView key={tName} offset="sm" radius={999} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 9, paddingHorizontal: 14 }}>
                  <Pressable onPress={() => toggleTaste(tName)}>
                    <Banner s={11} tk={0.1} c={C.inkDeep}>
                      {tName}
                    </Banner>
                  </Pressable>
                </StickerView>
              ) : (
                <Pressable key={tName} onPress={() => toggleTaste(tName)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 9, paddingHorizontal: 14 }}>
                  <Banner s={11} tk={0.1} c={C.inkDeep}>
                    {tName}
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

  // Step 3 — house rules
  return (
    <View style={{ flex: 1, backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        <Banner s={11} tk={0.16} c={C.ink400}>
          Step 3 of 3
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
        <StickerPressable offset="sm" radius={999} onPress={submit} style={{ marginTop: 20, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.stampGreen, paddingVertical: 14 }}>
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
                Admitted{'\n'}Nº {(profile?.passportNo ?? 4102).toLocaleString()}
              </Banner>
            </Roundel>
          </StampIn>
        </View>
      ) : null}
    </View>
  );
}

const inputStyle = {
  fontFamily: 'Fraunces_400Regular' as const,
  fontSize: 16,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderWidth: 2.5,
  borderColor: C.inkBlack,
  backgroundColor: C.paper0,
  color: C.inkBlack,
};
