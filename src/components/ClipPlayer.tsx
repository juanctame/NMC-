/**
 * TikTok-style clip player (native): the platform's official embed (YouTube,
 * TikTok, Vimeo, Dailymotion, Instagram) or an open video file, looping, in a
 * WebView. Pause / sound are left to the player on native; the web build
 * (ClipPlayer.web.tsx) drives them from our own controls.
 */
import React from 'react';
import { VideoEmbed } from './VideoEmbed';
import { embedUrlFor, type TrendingVideo } from '../data/videos';

export function clipEmbedUrl(id: string): string {
  const p = 'playsinline=1&rel=0&modestbranding=1&autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&iv_load_policy=3';
  return `https://www.youtube-nocookie.com/embed/${id}?${p}&playlist=${id}`;
}

type ClipSrc = Pick<TrendingVideo, 'platform' | 'embedId' | 'src' | 'thumb' | 'mime'>;

export function ClipPlayer({ clip }: { clip: ClipSrc; paused: boolean; muted: boolean }) {
  if (clip.platform === 'youtube' && clip.embedId && !clip.src) return <VideoEmbed url={clipEmbedUrl(clip.embedId)} />;
  const url = embedUrlFor({ ...clip, id: '', placeId: '', creator: '', handle: '', caption: '', sourceUrl: '' });
  return url ? <VideoEmbed url={url} /> : null;
}
