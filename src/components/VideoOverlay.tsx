/**
 * Full-screen in-app video player. Shown above everything when the store's
 * `videoUrl` is set (a viewer tapped a creator clip). Plays the platform's
 * official embed via VideoEmbed (iframe on web, WebView on native) inside a
 * framed card, with the creator credited underneath — the clip plays here,
 * nothing redirects out.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from './Text';
import { StickerView } from './Sticker';
import { VideoEmbed } from './VideoEmbed';

export function VideoOverlay() {
  const insets = useSafeAreaInsets();
  const videoUrl = useStore((s) => s.videoUrl);
  const closeVideo = useStore((s) => s.closeVideo);
  const meta = useStore((s) => s.videoMeta);
  if (!videoUrl) return null;
  const views = meta?.views
    ? meta.views >= 1e6
      ? (meta.views / 1e6).toFixed(1).replace('.0', '') + 'M'
      : meta.views >= 1e3
        ? Math.round(meta.views / 1e3) + 'k'
        : String(meta.views)
    : '';

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        backgroundColor: 'rgba(27,16,4,0.86)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
      }}
    >
      <Pressable
        onPress={closeVideo}
        accessibilityLabel="Close video"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          width: '100%',
          maxWidth: 460,
          aspectRatio: 9 / 16,
          maxHeight: '82%',
          borderWidth: 2.5,
          borderColor: C.inkBlack,
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
      >
        <VideoEmbed url={videoUrl} />
      </View>
      {meta ? (
        <View pointerEvents="none" style={{ width: '100%', maxWidth: 460, marginTop: 10, gap: 3 }}>
          <Serif s={13} c={C.paper0} numberOfLines={2} style={{ lineHeight: 17 }}>
            {meta.title}
          </Serif>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Banner s={9} tk={0.08} c={C.sun300}>
              {meta.creator}
            </Banner>
            <Mono s={8.5} c={C.ink100}>
              {[meta.platform, views && `${views} views`, meta.hd ? 'HD' : '', meta.placeName].filter(Boolean).join(' · ')}
            </Mono>
          </View>
        </View>
      ) : null}
      <View style={{ position: 'absolute', top: insets.top + 10, right: 16 }}>
        <StickerView offset="sm" radius={999}>
          <Pressable
            onPress={closeVideo}
            accessibilityLabel="Close video"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}
          >
            <Display s={18} c={C.ink400}>
              ✕
            </Display>
          </Pressable>
        </StickerView>
      </View>
    </View>
  );
}
