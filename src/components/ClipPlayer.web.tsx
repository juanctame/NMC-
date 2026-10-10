/**
 * TikTok-style clip player (web): YouTube's privacy-enhanced embed with its own
 * controls hidden, looping, starting muted (browsers block autoplay with sound),
 * driven from our UI — tap to pause / play, a sound toggle — via the embed's
 * postMessage command API. Plays in place; never navigates away.
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

export function clipEmbedUrl(id: string): string {
  const p = 'playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&iv_load_policy=3&disablekb=1';
  return `https://www.youtube-nocookie.com/embed/${id}?${p}&playlist=${id}`;
}

export function ClipPlayer({ embedId, paused, muted }: { embedId: string; paused: boolean; muted: boolean }) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  const send = (func: string) => {
    try {
      ref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
    } catch {
      /* player not ready */
    }
  };

  useEffect(() => {
    send(paused ? 'pauseVideo' : 'playVideo');
  }, [paused]);
  useEffect(() => {
    send(muted ? 'mute' : 'unMute');
  }, [muted]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {React.createElement('iframe', {
        ref,
        src: clipEmbedUrl(embedId),
        title: 'Creator clip',
        allow: 'autoplay; encrypted-media; picture-in-picture',
        // Re-apply the current state once the player is ready.
        onLoad: () =>
          setTimeout(() => {
            send(muted ? 'mute' : 'unMute');
            if (paused) send('pauseVideo');
          }, 600),
        style: { border: 'none', width: '100%', height: '100%', pointerEvents: 'none' },
      })}
    </View>
  );
}
