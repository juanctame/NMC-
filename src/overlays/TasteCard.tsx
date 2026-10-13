/**
 * Taste card — a shareable "passport of taste". It opens on the 3D render of
 * the Food Passport (the brand's hero shot), then the member's archetype, palate
 * radar and flavor DNA. Share sends the render with a one-line summary through
 * the native share sheet where files are supported, else the text alone, else
 * copies it. Rendered as a centered overlay above the profile.
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
import { Asset } from 'expo-asset';
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
      // Attach the passport render when the platform can share files.
      let files: any[] | undefined;
      try {
        const F: any = (globalThis as any).File;
        const src = Asset.fromModule(BRAND.passportHero).uri;
        if (nav?.canShare && F && src) {
          const blob = await (await fetch(src)).blob();
          const f = new F([blob], 'crtq-food-passport.jpg', { type: 'image/jpeg' });
          if (nav.canShare({ files: [f] })) files = [f];
        }
      } catch {
        files = undefined;
      }
      if (nav?.share) {
        await nav.share(files ? { title: 'CRTQ', text, files } : { title: 'CRTQ', text });
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
          {/* the hero: the Food Passport, rendered in 3D */}
          <View style={{ marginTop: -20, marginHorizontal: -20, marginBottom: 14, height: 176, borderBottomWidth: 3, borderBottomColor: C.inkBlack, backgroundColor: C.ink400, overflow: 'hidden' }}>
            <Image source={BRAND.passportHero} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="The CRTQ Food Passport and press passport, rendered in 3D" />
            <View style={{ position: 'absolute', left: 12, bottom: 10, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 3, paddingHorizontal: 8, transform: [{ rotate: '-3deg' }] }}>
              <Banner s={8.5} tk={0.16} c={C.inkDeep}>
                FOOD PASSPORT · Nº {String(me.passportNo).padStart(6, '0')}
              </Banner>
            </View>
          </View>
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

          <Display s={24} c={C.paper0} style={{ marginTop: 10, lineHeight: 25 }}>
            {archTitle}
          </Display>
          <SerifItalic s={12.5} c={C.sun300} style={{ marginTop: 3, lineHeight: 18 }}>
            {t('arch.' + palate.archId + '.b')}
          </SerifItalic>

          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <PalateRadar axes={palate.axes} labels={axisLabels} size={150} showLabels={false} fill={C.sun400} />
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
            <Banner s={11} tk={0.05} c={C.inkDeep} numberOfLines={1}>
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
