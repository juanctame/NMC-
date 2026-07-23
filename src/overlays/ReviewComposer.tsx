/**
 * Write-a-review composer. Pick a 1–10 rating (the chip shows its band colour)
 * and write your take; posting publishes it to the place's public review list.
 */
import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { scoreStyle } from '../store/helpers';
import { C } from '../theme/tokens';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

const SCORES = [3, 4, 5, 6, 7, 8, 9, 10];

export function ReviewComposer() {
  const insets = useSafeAreaInsets();
  const placeId = useStore((s) => s.reviewPlaceId);
  const nearbyById = useStore((s) => s.nearbyById);
  const score = useStore((s) => s.reviewDraftScore);
  const text = useStore((s) => s.reviewDraftText);
  const setScore = useStore((s) => s.setReviewDraftScore);
  const setText = useStore((s) => s.setReviewDraftText);
  const post = useStore((s) => s.postReview);
  const close = useStore((s) => s.closeReviewComposer);

  const place = resolvePlace(placeId, nearbyById);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 56 }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.55)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Display s={22} c={C.inkDeep}>
              Write a review
            </Display>
            <Pressable onPress={close}>
              <Mono s={12} c={C.inkMuted}>
                Close ✕
              </Mono>
            </Pressable>
          </View>
          {place ? (
            <SerifDisplay s={16} c={C.ink400} style={{ marginTop: 2 }}>
              {place.name}
            </SerifDisplay>
          ) : null}
          <SerifItalic s={12.5} c={C.inkMuted} style={{ marginTop: 2 }}>
            Your take goes public. Rate it and say why.
          </SerifItalic>

          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginTop: 16, marginBottom: 8 }}>
            Your score
          </Banner>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCORES.map((n) => {
              const on = score === n;
              const ss = scoreStyle(n);
              return (
                <Pressable
                  key={n}
                  onPress={() => setScore(n)}
                  style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: on ? ss.bg : C.paper0, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Display s={15} c={on ? ss.fg : C.inkDeep}>
                    {n}
                  </Display>
                </Pressable>
              );
            })}
          </View>

          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginTop: 16, marginBottom: 8 }}>
            Your review
          </Banner>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What should the table know?"
            placeholderTextColor={C.inkSoft}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top', fontFamily: 'Fraunces_400Regular', fontSize: 14.5, lineHeight: 21, padding: 12, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, color: C.inkBlack }}
          />

          <StickerPressable offset="sm" radius={999} onPress={post} style={{ marginTop: 16, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.stampGreen, paddingVertical: 14 }}>
            <Banner s={14} tk={0.1} c={C.paper0}>
              Post review
            </Banner>
          </StickerPressable>
        </SheetUp>
      </View>
    </View>
  );
}
