/**
 * Trending video reel — full-bleed place photo with a slow ken-burns zoom
 * (stand-in for video) under a top/bottom scrim. Up/down rail cycles the
 * trending list; critic/people pills + a scrub bar sit at the bottom.
 */
import React, { useState, useEffect } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useStore } from '../store/useStore';
import { byId } from '../store/data';
import { TRENDING_VIDEOS, embedUrlFor } from '../data/videos';
import { PLATFORM_LABEL } from '../data/creators';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { MuteIcon, ChevronUp, ChevronDown, PlayIcon } from '../components/icons';
import { useSlowZoom } from '../components/Anim';
import { VideoEmbed } from '../components/VideoEmbed';

export function Reel() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const reelIndex = useStore((s) => s.reelIndex);
  const reelGo = useStore((s) => s.reelGo);
  const openPlace = useStore((s) => s.openPlace);

  const video = TRENDING_VIDEOS[reelIndex] || TRENDING_VIDEOS[0];
  const rp = byId[video.placeId];
  const rank = reelIndex + 1;
  const total = TRENDING_VIDEOS.length;
  const platform = PLATFORM_LABEL[video.platform];
  const cs = scoreStyle(rp.critic || 0);
  const ps = scoreStyle(rp.people || 0);
  const scale = useSlowZoom();

  const embedUrl = embedUrlFor(video);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [reelIndex]);
  const onPlay = () => (embedUrl ? setPlaying(true) : Linking.openURL(video.sourceUrl));

  return (
    <View style={{ flex: 1, backgroundColor: C.inkBlack, overflow: 'hidden' }}>
      {playing && embedUrl ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}>
          <VideoEmbed url={embedUrl} />
        </View>
      ) : (
        <>
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ scale }] }}>
            <Image source={photo(rp.photo)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.32)' }} />
          </Animated.View>
          <LinearGradient
            colors={['rgba(42,26,6,0.5)', 'rgba(42,26,6,0)', 'rgba(42,26,6,0)', 'rgba(42,26,6,0.82)']}
            locations={[0, 0.28, 0.52, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* center play */}
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <StickerPressable offset="lg" radius={999} onPress={onPlay} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(251,245,229,0.95)', borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ marginLeft: 4 }}>
                <PlayIcon size={30} color={C.ink400} />
              </View>
            </StickerPressable>
          </View>
        </>
      )}

      {/* top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StickerView offset="sm" radius={999}>
          <Pressable onPress={() => go('feed')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={17} c={C.ink400}>
              ←
            </Display>
          </Pressable>
        </StickerView>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.paper0 }} />
          <Banner s={10} tk={0.16} c={C.paper0}>
            {platform} · {rank} of {total}
          </Banner>
        </View>
        {playing ? (
          <StickerPressable offset="sm" radius={999} onPress={() => setPlaying(false)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 5, paddingHorizontal: 11 }}>
            <Banner s={9} tk={0.1} c={C.inkDeep}>
              ✕ Stop
            </Banner>
          </StickerPressable>
        ) : (
          <MuteIcon size={18} color={C.paper0} />
        )}
      </View>

      {/* right rail */}
      <View style={{ position: 'absolute', right: 14, top: '50%', marginTop: -50, gap: 12 }}>
        <StickerPressable offset="sm" radius={999} onPress={() => reelGo(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251,245,229,0.9)', borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronUp size={18} color={C.ink400} />
        </StickerPressable>
        <StickerPressable offset="sm" radius={999} onPress={() => reelGo(1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251,245,229,0.9)', borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronDown size={18} color={C.ink400} />
        </StickerPressable>
      </View>

      {/* bottom */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Banner s={10} tk={0.16} c={C.sun400}>
            Trending Nº {rank}
          </Banner>
          <View style={{ backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
            <Banner s={8} tk={0.1} c={C.paper0}>
              {platform}
            </Banner>
          </View>
        </View>
        <Display s={30} c={C.paper0} style={{ marginTop: 5, lineHeight: 30 }}>
          {rp.name}
        </Display>
        <Mono s={10} c={C.ink100} style={{ marginTop: 5 }}>
          {video.creator} · {video.handle} · {metaOf(rp)}
        </Mono>
        <Serif s={13.5} c={C.paper0} style={{ marginTop: 8, lineHeight: 20, maxWidth: 320 }}>
          {video.caption}
        </Serif>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: cs.bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}>
            <Banner s={9} tk={0.1} c={cs.fg}>
              Critics
            </Banner>
            <Display s={13} c={cs.fg}>
              {fmt(rp.critic || 0)}
            </Display>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ps.bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}>
            <Banner s={9} tk={0.1} c={ps.fg}>
              People
            </Banner>
            <Display s={13} c={ps.fg}>
              {fmt(rp.people || 0)}
            </Display>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <StickerPressable offset="sm" radius={999} onPress={() => Linking.openURL(video.sourceUrl)} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 11 }}>
            <Banner s={11} tk={0.1} c={C.inkDeep}>
              ▶ Watch on {platform}
            </Banner>
          </StickerPressable>
          <StickerPressable offset="sm" radius={999} onPress={() => openPlace(video.placeId)} style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 11, paddingHorizontal: 16 }}>
            <Banner s={11} tk={0.1} c={C.inkDeep}>
              See place →
            </Banner>
          </StickerPressable>
        </View>
        <View style={{ height: 5, marginTop: 14, borderWidth: 1.5, borderColor: C.paper0, backgroundColor: 'rgba(251,245,229,0.25)' }}>
          <View style={{ height: '100%', width: '42%', backgroundColor: C.sun400 }} />
        </View>
      </View>
    </View>
  );
}
