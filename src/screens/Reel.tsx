/**
 * Trending reel — the city's most-talked-about restaurants, one creator clip at
 * a time, played full-screen *inside the app* (the platform's official embed
 * player; nothing redirects out). Each clip is the venue's best third-party, HD
 * clip found by its hashtag (data/clips.ts). Step through with the arrows;
 * "See place" opens the restaurant.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { embedUrlFor } from '../data/videos';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { ChevronUp, ChevronDown } from '../components/icons';
import { VideoEmbed } from '../components/VideoEmbed';

function compact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'k';
  return String(n);
}

export function Reel() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const reelIndex = useStore((s) => s.reelIndex);
  const reelGo = useStore((s) => s.reelGo);
  const openPlace = useStore((s) => s.openPlace);
  const list = useStore((s) => s.monthlyTrending);

  const item = list[reelIndex] || list[0];
  const url = item ? embedUrlFor(item.video) : null;
  const clip = item?.video as (typeof item)['video'] & { views?: number; hd?: boolean };

  return (
    <View style={{ flex: 1, backgroundColor: C.inkBlack, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      {/* top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 10 }}>
        <StickerView offset="sm" radius={999}>
          <Pressable onPress={() => go('feed')} accessibilityLabel="Back" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={18} c={C.ink400}>
              ←
            </Display>
          </Pressable>
        </StickerView>
        <Banner s={11} tk={0.14} c={C.paper0} style={{ flex: 1 }}>
          Trending now
        </Banner>
        {list.length ? (
          <Mono s={10} c={C.ink100}>
            {Math.min(reelIndex, list.length - 1) + 1} / {list.length}
          </Mono>
        ) : null}
      </View>

      {item && url ? (
        <>
          {/* the clip, playing here */}
          <View style={{ flex: 1, marginHorizontal: 14, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: '#000', overflow: 'hidden' }}>
            <VideoEmbed key={item.video.id} url={url + '&autoplay=1'} />
          </View>

          {/* credits + controls */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 6 }}>
            <Pressable onPress={() => openPlace(item.placeId)}>
              <Display s={22} c={C.paper0} numberOfLines={1}>
                {item.name}
              </Display>
            </Pressable>
            <Serif s={12.5} c={C.ink100} numberOfLines={2} style={{ lineHeight: 17 }}>
              {item.video.caption}
            </Serif>
            <Mono s={9} c={C.sun300} numberOfLines={1}>
              {[item.video.creator, 'YouTube', clip?.views ? `${compact(clip.views)} views` : '', clip?.hd ? 'HD' : '', `${item.mentions} creator clip${item.mentions === 1 ? '' : 's'}`]
                .filter(Boolean)
                .join(' · ')}
            </Mono>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <StickerPressable offset="sm" radius={999} onPress={() => reelGo(-1)} accessibilityLabel="Previous clip" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronUp size={18} color={C.inkDeep} />
              </StickerPressable>
              <StickerPressable offset="sm" radius={999} onPress={() => reelGo(1)} accessibilityLabel="Next clip" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={18} color={C.inkDeep} />
              </StickerPressable>
              <View style={{ flex: 1 }}>
                <StickerPressable offset="sm" radius={999} onPress={() => openPlace(item.placeId)} style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 12 }}>
                  <Banner s={11} tk={0.1} c={C.inkDeep}>
                    See place →
                  </Banner>
                </StickerPressable>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 }}>
          <Banner s={11} tk={0.14} c={C.paper0}>
            No clips yet
          </Banner>
          <Serif s={13} c={C.ink100} style={{ textAlign: 'center', lineHeight: 19 }}>
            Creator clips appear here as they're found by each restaurant's hashtag.
          </Serif>
        </View>
      )}
    </View>
  );
}
