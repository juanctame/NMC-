/**
 * In-app embedded playback (native). Renders the platform's embed player in a
 * WebView so a TikTok / Instagram / YouTube clip plays inside the reel. The web
 * build uses VideoEmbed.web.tsx (an <iframe>) instead — Metro resolves per
 * platform.
 */
import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export function VideoEmbed({ url }: { url: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        originWhitelist={['*']}
      />
    </View>
  );
}
