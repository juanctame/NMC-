/**
 * Landing reel (web) — the platform's HD clips looping full-bleed behind the
 * sign-in screen: muted, inline, each one ~7 s from past its intro, crossfading
 * into the next. Two <video> layers swap so the next clip is already playing
 * before it fades in. A clip that fails is skipped; if none plays, nothing is
 * drawn and the brand cover shows as before. Reduced motion or Data Saver shows
 * the first clip's still instead.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { REEL, REEL_SEGMENT_S, sourcesFor, type ReelClip } from '../data/landingReel';

const FADE_MS = 1200;

function prefersStill(): boolean {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    return !!conn?.saveData;
  } catch {
    return false;
  }
}

/** Point a <video> at a clip: its best sources for this screen, from its start. */
function load(v: HTMLVideoElement, c: ReelClip) {
  const px = Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1);
  while (v.firstChild) v.removeChild(v.firstChild);
  for (const s of sourcesFor(c, px)) {
    const el = document.createElement('source');
    el.src = c.start ? `${s.src}#t=${c.start}` : s.src;
    el.type = s.type;
    v.appendChild(el);
  }
  v.poster = c.poster || '';
  v.load();
}

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: `opacity ${FADE_MS}ms ease`,
  pointerEvents: 'none',
};

/** Warm, dark scrim so the sign-in reads over any footage (brand ink, a touch of sun at the top). */
const SCRIM: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(42,26,6,0.55) 0%, rgba(20,12,4,0.42) 38%, rgba(20,12,4,0.62) 70%, rgba(14,8,2,0.86) 100%)',
};

export function LandingReel({ onClip }: { onClip?: (c: ReelClip | null) => void }) {
  const a = React.useRef<HTMLVideoElement | null>(null);
  const b = React.useRef<HTMLVideoElement | null>(null);
  const [front, setFront] = React.useState<0 | 1>(0);
  const [live, setLive] = React.useState(false);
  const still = React.useMemo(prefersStill, []);
  const onClipRef = React.useRef(onClip);
  onClipRef.current = onClip;

  React.useEffect(() => {
    if (still || !REEL.length) {
      onClipRef.current?.(REEL.find((c) => c.poster) || null);
      return;
    }
    const layers = [a.current!, b.current!];
    layers.forEach((v) => {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
    });
    const dead = new Set<number>();
    let idx = -1;
    let cur: 0 | 1 = 1;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    // Play clip i on the back layer; once it's actually playing, fade it to the front.
    const advance = (tries = 0) => {
      if (stopped) return;
      if (dead.size >= REEL.length || tries > REEL.length) {
        setLive(false);
        onClipRef.current?.(null);
        return;
      }
      idx = (idx + 1) % REEL.length;
      if (dead.has(idx)) return advance(tries + 1);
      const next: 0 | 1 = cur === 0 ? 1 : 0;
      const v = layers[next];
      const clip = REEL[idx];
      const myIdx = idx;
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        cleanup();
        dead.add(myIdx);
        advance(tries + 1);
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        cleanup();
        cur = next;
        setFront(next);
        setLive(true);
        onClipRef.current?.(clip);
        const prev = layers[next === 0 ? 1 : 0];
        setTimeout(() => !stopped && prev.pause(), FADE_MS + 100);
        const len = clip.durationSec ? Math.min(REEL_SEGMENT_S, Math.max(3, clip.durationSec - (clip.start || 0) - 0.5)) : REEL_SEGMENT_S;
        timer = setTimeout(() => advance(), len * 1000);
      };
      const guard = setTimeout(fail, 12000); // never stalls on a slow file
      const onErr = () => fail();
      const onPlaying = () => ok();
      const onEnded = () => {
        if (cur === next && timer) {
          clearTimeout(timer);
          advance();
        }
      };
      function cleanup() {
        clearTimeout(guard);
        v.removeEventListener('playing', onPlaying);
        v.removeEventListener('error', onErr, true);
      }
      v.addEventListener('playing', onPlaying);
      v.addEventListener('error', onErr, true); // <source> errors don't bubble
      v.onended = onEnded;
      load(v, clip);
      v.play().catch(() => {
        // autoplay refused (power saving, policy): show the still, try again on a tap
        if (!settled) {
          settled = true;
          cleanup();
          onClipRef.current?.(clip);
          const retry = () => {
            document.removeEventListener('pointerdown', retry);
            idx = myIdx - 1;
            advance();
          };
          document.addEventListener('pointerdown', retry, { once: true });
        }
      });
    };
    advance();
    const vis = () => {
      const v = layers[cur];
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', vis);
      layers.forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        while (v.firstChild) v.removeChild(v.firstChild);
      });
    };
  }, [still]);

  if (!REEL.length) return null;
  if (still) {
    const c = REEL.find((x) => x.poster);
    return c ? (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {React.createElement('img', { src: c.poster, alt: '', style: { ...videoStyle, transition: undefined } })}
        {React.createElement('div', { style: SCRIM })}
      </View>
    ) : null;
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#140c04', opacity: live ? 1 : 0 }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {React.createElement('video', { ref: a, 'aria-hidden': true, muted: true, playsInline: true, preload: 'auto', 'data-reel': 'a', style: { ...videoStyle, opacity: front === 0 ? 1 : 0 } })}
      {React.createElement('video', { ref: b, 'aria-hidden': true, muted: true, playsInline: true, preload: 'auto', 'data-reel': 'b', style: { ...videoStyle, opacity: front === 1 ? 1 : 0 } })}
      {React.createElement('div', { style: SCRIM })}
    </View>
  );
}
