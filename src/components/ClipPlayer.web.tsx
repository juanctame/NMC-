/**
 * TikTok-style clip player (web). Plays every source in place, driven from our
 * own UI — tap to pause / play, a sound toggle — and never navigates away:
 *  - open video files (Wikimedia Commons / Internet Archive MP4 & WebM): a
 *    native <video>, looping, muted until sound is turned on;
 *  - YouTube: the privacy-enhanced embed, its controls hidden, via the iframe
 *    postMessage command API;
 *  - TikTok (player v1), Vimeo and Dailymotion: their official embed players,
 *    each through its own postMessage API;
 *  - Instagram: the reel embed (no player API — it plays on tap).
 * Browsers block autoplay with sound, so every clip starts muted.
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { TrendingVideo } from '../data/videos';

export function clipEmbedUrl(id: string): string {
  const p = 'playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&iv_load_policy=3&disablekb=1';
  return `https://www.youtube-nocookie.com/embed/${id}?${p}&playlist=${id}`;
}

type ClipSrc = Pick<TrendingVideo, 'platform' | 'embedId' | 'src' | 'thumb' | 'mime'>;

/** The autoplaying, looping, muted embed URL for a clip's platform (null for files). */
export function clipPlayerUrl(c: ClipSrc): string | null {
  if (c.src || !c.embedId) return null;
  const id = c.embedId;
  switch (c.platform) {
    case 'youtube':
      return clipEmbedUrl(id);
    case 'tiktok':
      return `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&muted=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}?autoplay=1&loop=1&muted=1&controls=0&playsinline=1&dnt=1&title=0&byline=0&portrait=0`;
    case 'dailymotion':
      return `https://www.dailymotion.com/embed/video/${id}?autoplay=1&mute=1&controls=0&loop=1&queue-enable=false&sharing-enable=false&ui-logo=false&api=postMessage`;
    case 'instagram':
      return `https://www.instagram.com/reel/${id}/embed/?hidecaption=1`;
    default:
      return null;
  }
}

/** One postMessage command per platform for play / pause / mute / unmute. */
function command(platform: string, action: 'play' | 'pause' | 'mute' | 'unmute'): unknown | null {
  switch (platform) {
    case 'youtube':
      return JSON.stringify({ event: 'command', func: { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unmute: 'unMute' }[action], args: [] });
    case 'tiktok':
      return { 'x-tiktok-player': true, type: action, value: undefined };
    case 'vimeo':
      return JSON.stringify(action === 'play' || action === 'pause' ? { method: action } : { method: 'setMuted', value: action === 'mute' });
    case 'dailymotion':
      return JSON.stringify(action === 'play' || action === 'pause' ? { command: action, parameters: [] } : { command: 'muted', parameters: [action === 'mute'] });
    default:
      return null;
  }
}

export function ClipPlayer({ clip, paused, muted }: { clip: ClipSrc; paused: boolean; muted: boolean }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  const send = (action: 'play' | 'pause' | 'mute' | 'unmute') => {
    const msg = command(clip.platform, action);
    if (msg == null) return;
    try {
      frame.current?.contentWindow?.postMessage(msg, '*');
    } catch {
      /* player not ready */
    }
  };

  useEffect(() => {
    const v = video.current;
    if (v) {
      if (paused) v.pause();
      else v.play().catch(() => undefined);
    } else send(paused ? 'pause' : 'play');
  }, [paused]);
  useEffect(() => {
    const v = video.current;
    if (v) v.muted = muted;
    else send(muted ? 'mute' : 'unmute');
  }, [muted]);

  // Open file — the browser plays it natively.
  if (clip.src) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {React.createElement('video', {
          ref: video,
          src: clip.src,
          poster: clip.thumb,
          autoPlay: true,
          loop: true,
          muted: true,
          playsInline: true,
          preload: 'auto',
          'aria-label': 'Clip',
          onLoadedData: () => {
            const v = video.current;
            if (!v) return;
            v.muted = muted;
            if (paused) v.pause();
            else v.play().catch(() => {
              // Autoplay with sound refused — fall back to muted.
              v.muted = true;
              v.play().catch(() => undefined);
            });
          },
          style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000', pointerEvents: 'none' },
        })}
      </View>
    );
  }

  const url = clipPlayerUrl(clip);
  if (!url) return null;
  // Instagram has no player API, so its own controls stay tappable.
  const interactive = clip.platform === 'instagram';
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {React.createElement('iframe', {
        ref: frame,
        src: url,
        title: 'Creator clip',
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        // Re-apply the current state once the player is ready.
        onLoad: () =>
          setTimeout(() => {
            send(muted ? 'mute' : 'unmute');
            if (paused) send('pause');
          }, 600),
        style: { border: 'none', width: '100%', height: '100%', pointerEvents: interactive ? 'auto' : 'none' },
      })}
    </View>
  );
}
