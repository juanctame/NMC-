/**
 * Taste card — a shareable "passport of taste". A compact, striking card of the
 * member's archetype, palate radar, and flavor DNA that reads like a collectible
 * stamp. Share copies a one-line summary (or uses the native share sheet where
 * available). Rendered as a centered overlay above the profile.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { identity } from '../data/profile';
import { computePalate, PALATE_AXES } from '../data/palate';
import { C } from '../theme/tokens';
import { BRAND } from '../assets';
import { Image } from 'expo-image';
import { Display, Banner, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { PalateRadar } from '../components/PalateRadar';
import { Grain } from '../components/Grain';

export function TasteCard() {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeTasteCard);
  const profile = useStore((s) => s.profile);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const t = useT();
  const [copied, setCopied] = useState(false);

  const me = identity(profile);
  const palate = computePalate(ranked, tastes, userReviews);
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));
  const archTitle = t('arch.' + palate.archId + '.t');
  const cuisines = palate.topCuisines.map((c) => c.name).slice(0, 3).join(' · ');

  const share = async () => {
    const text = `${archTitle} — ${cuisines}. ${me.handle} · CRTQ`;
    try {
      const nav: any = (globalThis as any).navigator;
      if (nav?.share) {
        await nav.share({ title: 'CRTQ', text });
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // user dismissed / unsupported — no-op
    }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,16,4,0.78)' }} />
      <View style={{ width: '100%', maxWidth: 340 }}>
        {/* the card */}
        <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 3, borderColor: C.inkBlack, padding: 20, overflow: 'hidden' }}>
          <Grain opacity={0.1} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={BRAND.logo} style={{ width: 34, height: 34, transform: [{ rotate: '-6deg' }] }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Banner s={9} tk={0.2} c={C.sun400}>
                {t('tasteCard.title')}
              </Banner>
              <Mono s={9} c={C.ink100} style={{ marginTop: 2 }}>
                {me.handle} · {me.name}
              </Mono>
            </View>
          </View>

          <Display s={26} c={C.paper0} style={{ marginTop: 14, lineHeight: 27 }}>
            {archTitle}
          </Display>
          <SerifItalic s={12.5} c={C.sun300} style={{ marginTop: 3, lineHeight: 18 }}>
            {t('arch.' + palate.archId + '.b')}
          </SerifItalic>

          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <PalateRadar axes={palate.axes} labels={axisLabels} size={186} showLabels={false} fill={C.sun400} />
          </View>

          {/* DNA dots */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 }}>
            {palate.topCuisines.map((c) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: c.color, borderWidth: 1.5, borderColor: C.inkBlack }} />
                <Banner s={8.5} tk={0.04} c={C.paper0}>
                  {c.name}
                </Banner>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 10 }}>
            <Mono s={8.5} c={C.ink100}>
              {palate.sampleSize} {t('stat.ranked').toLowerCase()} · {palate.distinct} {t('stat.cuisines').toLowerCase()}
            </Mono>
            <Mono s={8.5} c={C.sun300}>
              juanctame.github.io/NMC-
            </Mono>
          </View>
        </StickerView>

        {/* actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <StickerPressable offset="sm" radius={999} onPress={share} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 13 }}>
            <Banner s={12} tk={0.1} c={C.inkDeep}>
              {copied ? t('tasteCard.copied') : t('tasteCard.share')}
            </Banner>
          </StickerPressable>
          <Pressable onPress={close} style={{ borderWidth: 2, borderColor: C.paper0, borderRadius: 999, backgroundColor: 'transparent', paddingVertical: 13, paddingHorizontal: 20, justifyContent: 'center' }}>
            <Banner s={11} tk={0.1} c={C.paper0}>
              {t('common.close')}
            </Banner>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
