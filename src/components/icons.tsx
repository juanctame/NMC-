/**
 * Icon set — the prototype's exact single-stroke (Lucide-style) SVG paths,
 * rendered with react-native-svg so they match the design pixel-for-pixel.
 */
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { C } from '../theme/tokens';

type IconProps = { size?: number; color?: string; sw?: number };

const stroke = (color: string = C.ink400, sw: number = 2) => ({
  stroke: color,
  strokeWidth: sw,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function MapIcon({ size = 16, color = C.ink400, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" {...stroke(color, sw)} />
      <Path d="M9 3v15M15 6v15" {...stroke(color, sw)} />
    </Svg>
  );
}

export function ChartIcon({ size = 16, color = C.ink400, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6 21V10M12 21V4M18 21v-7" {...stroke(color, sw)} />
    </Svg>
  );
}

export function PlayIcon({ size = 12, color = C.ink400 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M8 5v14l11-7z" fill={color} />
    </Svg>
  );
}

export function HeartIcon({ size = 18, color = C.inkMuted, sw = 2, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9z"
        stroke={color}
        strokeWidth={sw}
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function CommentIcon({ size = 17, color = C.inkMuted, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2.5-3.2A8.5 8.5 0 1 1 21 11.5z" {...stroke(color, sw)} />
    </Svg>
  );
}

export function BookmarkIcon({ size = 16, color = C.inkMuted, sw = 2, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6 3h12v18l-6-4-6 4z" stroke={color} strokeWidth={sw} fill={filled ? color : 'none'} />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = C.paper0, sw = 2.6 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M12 5v14M5 12h14" {...stroke(color, sw)} />
    </Svg>
  );
}

export function MuteIcon({ size = 18, color = C.paper0, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M11 5 6 9H2v6h4l5 4V5z" {...stroke(color, sw)} />
      <Path d="M22 9l-6 6M16 9l6 6" {...stroke(color, sw)} />
    </Svg>
  );
}

export function ChevronUp({ size = 18, color = C.ink400, sw = 2.4 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M18 15l-6-6-6 6" {...stroke(color, sw)} />
    </Svg>
  );
}

export function ChevronDown({ size = 18, color = C.ink400, sw = 2.4 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M6 9l6 6 6-6" {...stroke(color, sw)} />
    </Svg>
  );
}

// ── Bottom tab glyphs ──
export function TabFeed({ size = 22, color = C.inkSoft, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="3" y="4" width="18" height="6" rx="1" {...stroke(color, sw)} />
      <Rect x="3" y="14" width="18" height="6" rx="1" {...stroke(color, sw)} />
    </Svg>
  );
}

export function TabGuide({ size = 22, color = C.inkSoft, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M8 6h13M8 12h13M8 18h13" {...stroke(color, sw)} />
      <Circle cx="3.5" cy="6" r="1.3" fill={color} />
      <Circle cx="3.5" cy="12" r="1.3" fill={color} />
      <Circle cx="3.5" cy="18" r="1.3" fill={color} />
    </Svg>
  );
}

export function TabTable({ size = 22, color = C.inkSoft, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M4 3v7a2 2 0 0 0 4 0V3M6 10v11" {...stroke(color, sw)} />
      <Path d="M17 3c-1.6 0-3 1.9-3 5s1.4 4 3 4M17 3v18" {...stroke(color, sw)} />
    </Svg>
  );
}

export function TabYou({ size = 22, color = C.inkSoft, sw = 2 }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="8" r="4" {...stroke(color, sw)} />
      <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...stroke(color, sw)} />
    </Svg>
  );
}

/** The globe mark used in the club header and feed teaser. */
export function GlobeMark({ size = 30, color = C.ink400, sw = 2.2 }: IconProps) {
  const s = stroke(color, sw);
  return (
    <Svg viewBox="0 0 200 200" width={size} height={size}>
      <Circle cx="100" cy="100" r="72" {...s} />
      <Path d="M28 82 h144M28 118 h144M100 28 v144" {...s} />
      {/* meridian + parallel ellipses approximated with paths for RN */}
      <Path d="M100 28 C60 40 60 160 100 172 C140 160 140 40 100 28 Z" {...s} />
      <Path d="M28 100 C40 60 160 60 172 100 C160 140 40 140 28 100 Z" {...s} />
      <Path d="M62 78 q8 -4 14 2 q6 6 14 0 q6 -4 12 4" {...stroke(color, 2.6)} />
      <Path d="M118 112 q10 2 14 10 q4 8 14 6" {...stroke(color, 2.6)} />
    </Svg>
  );
}
