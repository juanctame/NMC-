/**
 * Monogram — an original, deterministic "brand mark" for a venue or a chef.
 *
 * We do NOT scrape or re-host restaurants' own logos (they're trademarked, and
 * a stock scrape would be neither legal nor reliable). Instead each place gets
 * a hand-stamp style seal: its initials on a colour picked deterministically
 * from the name, in the app's travel-sticker look. Same name → same mark every
 * time, so it reads like a consistent logo across the app. Real photography of
 * the venue comes from live Google Maps photos (shown with attribution); this
 * mark is the fallback identity and the little logo stamp on the hero.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Banner } from './Text';
import { C } from '../theme/tokens';

const PALETTE = [C.ink400, C.stampGreen, C.stampBlue, C.stampPink, C.sun500, C.ink600, C.sun600, C.ink500];
const STOP = /^(y|e|de|del|la|las|los|el|of|the|a|and|&|con)$/i;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Significant words of a name (drops bracketed notes + connectors). */
function words(name: string): string[] {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[«»"'‟„&·|]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-zà-ÿ0-9]/i.test(w) && !STOP.test(w));
}

/** 1–2 letter initials for the mark, e.g. "Panadería Rosetta" → "PR". */
export function monogramOf(name: string): string {
  const w = words(name);
  const first = w[0]?.[0] || name.trim()[0] || '?';
  const last = w.length > 1 ? w[w.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Deterministic seal colour for a name. */
export function monogramColor(name: string): string {
  return PALETTE[hashStr(name) % PALETTE.length];
}

export function Monogram({
  name,
  size = 44,
  rot,
  fg = C.paper0,
  bg,
  style,
}: {
  name: string;
  size?: number;
  rot?: string;
  fg?: string;
  bg?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg || monogramColor(name),
          borderWidth: Math.max(2, size * 0.055),
          borderColor: C.inkBlack,
          alignItems: 'center',
          justifyContent: 'center',
          ...(rot ? { transform: [{ rotate: rot }] } : null),
        },
        style,
      ]}
    >
      <Banner s={Math.round(size * 0.36)} tk={0.02} c={fg}>
        {monogramOf(name)}
      </Banner>
    </View>
  );
}
