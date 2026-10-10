/**
 * TikTok-style clip player (native): the same privacy-enhanced YouTube embed,
 * looping, in a WebView. Pause / sound are left to the player on native; the web
 * build (ClipPlayer.web.tsx) drives them from our own controls.
 */
import React from 'react';
import { VideoEmbed } from './VideoEmbed';

export function clipEmbedUrl(id: string): string {
  const p = 'playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&iv_load_policy=3';
  return `https://www.youtube-nocookie.com/embed/${id}?${p}&playlist=${id}`;
}

export function ClipPlayer({ embedId }: { embedId: string; paused: boolean; muted: boolean }) {
  return <VideoEmbed url={clipEmbedUrl(embedId)} />;
}
