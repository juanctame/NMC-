/**
 * In-app embedded playback (web). Renders the platform's embed player in an
 * <iframe>. Metro resolves this file for the web build; native uses
 * VideoEmbed.tsx (a WebView).
 */
import React from 'react';
import { View } from 'react-native';

export function VideoEmbed({ url }: { url: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {React.createElement('iframe', {
        src: url,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write',
        allowFullScreen: true,
        style: { border: 'none', width: '100%', height: '100%' },
      })}
    </View>
  );
}
