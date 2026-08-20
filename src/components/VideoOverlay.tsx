/**
 * Full-screen embedded video player. Shown above everything when the store's
 * `videoUrl` is set (a viewer tapped a hashtag clip). Renders the platform's
 * embed via VideoEmbed (iframe on web, WebView on native) inside a framed card
 * with a tap-away backdrop and a close button.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { C } from '../theme/tokens';
import { Display } from './Text';
import { StickerView } from './Sticker';
import { VideoEmbed } from './VideoEmbed';

export function VideoOverlay() {
  const insets = useSafeAreaInsets();
  const videoUrl = useStore((s) => s.videoUrl);
  const closeVideo = useStore((s) => s.closeVideo);
  if (!videoUrl) return null;

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
