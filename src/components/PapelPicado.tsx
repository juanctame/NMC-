/**
 * Papel picado — a string of cut-paper flags generated from a foodie's palate,
 * their personal signature: flag colours come from the cuisines they eat most,
 * the cut-out motifs from their strongest palate axes (◆ calle, ○ mantel,
 * ≈ mar, ✿ dulce, ▲ fuego, ★ mundo), and the small variations from their handle.
 * No two profiles hang the same banner.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Polygon, G } from 'react-native-svg';
import type { Palate, AxisKey } from '../data/palate';
import { hashOf } from '../data/youProfile';
import { C } from '../theme/tokens';

export const MOTIF_GLYPH: Record<AxisKey, string> = { calle: '◆', mantel: '○', mar: '≈', dulce: '✿', fuego: '▲', mundo: '★' };

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** One cut-out motif centred at (x, y), radius r, drawn in the "hole" colour. */
function Motif({ kind, x, y, r, fill }: { kind: AxisKey; x: number; y: number; r: number; fill: string }) {
  switch (kind) {
    case 'calle':
      return <Polygon points={`${x},${y - r} ${x + r * 0.75},${y} ${x},${y + r} ${x - r * 0.75},${y}`} fill={fill} />;
    case 'mantel':
      return (
        <G>
          <Circle cx={x} cy={y} r={r * 0.9} fill={fill} />
        </G>
      );
    case 'mar':
      return <Path d={`M${x - r} ${y + r * 0.2} Q${x - r * 0.5} ${y - r * 0.8} ${x} ${y + r * 0.2} T${x + r} ${y + r * 0.2} L${x + r} ${y + r * 0.6} Q${x + r * 0.5} ${y - r * 0.3} ${x} ${y + r * 0.6} T${x - r} ${y + r * 0.6} Z`} fill={fill} />;
    case 'dulce':
      return (
        <G>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return <Circle key={i} cx={x + Math.cos(a) * r * 0.55} cy={y + Math.sin(a) * r * 0.55} r={r * 0.36} fill={fill} />;
          })}
        </G>
      );
    case 'fuego':
      return <Polygon points={`${x},${y - r} ${x + r * 0.85},${y + r * 0.75} ${x - r * 0.85},${y + r * 0.75}`} fill={fill} />;
    case 'mundo':
    default: {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.42 : r;
        pts.push(`${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`);
      }
      return <Polygon points={pts.join(' ')} fill={fill} />;
    }
  }
}

export function PapelPicado({
  palate,
  seed,
  width,
  height = 92,
  hole = C.ink700,
  flags = 6,
}: {
  palate: Palate;
  seed: string;
  width: number;
  height?: number;
  hole?: string; // the colour seen through the cut-outs (the band behind)
  flags?: number;
}) {
  if (width <= 0) return <View style={{ height }} />;
  const rand = rng(hashOf(seed));
  const axes = palate.axes.slice().sort((a, b) => b.value - a.value);
  const top = axes.filter((a) => a.value > 0.05).slice(0, 3).map((a) => a.key);
  const motifs: AxisKey[] = top.length ? top : ['mundo', 'mantel', 'calle'];
  // Your cuisines' colours first, then the rest of the palette — distinct, so the string stays festive.
  const colours = Array.from(new Set([...palate.topCuisines.map((c) => c.color), C.ink400, C.stampGreen, C.sun400, C.stampBlue, C.stampPink])).slice(0, Math.max(4, flags - 1));
  const offset = Math.floor(rand() * colours.length);

  const gap = 6;
  const fw = (width - gap * (flags + 1)) / flags;
  const sag = 8;
  const stringY = (x: number) => 6 + sag * Math.sin((x / width) * Math.PI);
  const fh = height - 14;

  return (
    <Svg width={width} height={height}>
      {/* the string */}
      <Path d={`M0 6 Q${width / 2} ${6 + sag * 2} ${width} 6`} stroke={C.paper0} strokeWidth={1.5} fill="none" opacity={0.7} />
      {Array.from({ length: flags }).map((_, i) => {
        const x0 = gap + i * (fw + gap);
        const y0 = stringY(x0 + fw / 2) - 1;
        const tilt = (rand() - 0.5) * 6;
        const colour = colours[(i + offset) % colours.length];
        const kind = motifs[i % motifs.length];
        // flag body with a scalloped / zig-zag bottom edge
        const teeth = 5;
        const tw = fw / teeth;
        let d = `M${x0} ${y0} L${x0 + fw} ${y0} L${x0 + fw} ${y0 + fh - 6}`;
        for (let t = teeth - 1; t >= 0; t--) {
          const tx = x0 + t * tw;
          d += ` L${tx + tw / 2} ${y0 + fh} L${tx} ${y0 + fh - 6}`;
        }
        d += ' Z';
        const cx = x0 + fw / 2;
        const big = Math.min(fw, fh) * (0.2 + rand() * 0.06);
        const small = big * 0.42;
        return (
          <G key={i} rotation={tilt} origin={`${cx}, ${y0}`}>
            <Path d={d} fill={colour} />
            {/* fold line at the top */}
            <Path d={`M${x0} ${y0 + 4} L${x0 + fw} ${y0 + 4}`} stroke={hole} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
            {/* the centre motif and a ring of small cuts */}
            <Motif kind={kind} x={cx} y={y0 + fh * 0.48} r={big} fill={hole} />
            {[0, 1, 2, 3].map((k) => {
              const sx = x0 + fw * (k % 2 ? 0.8 : 0.2);
              const sy = y0 + fh * (k < 2 ? 0.22 : 0.74);
              return <Motif key={k} kind={motifs[(i + k + 1) % motifs.length]} x={sx} y={sy} r={small} fill={hole} />;
            })}
          </G>
        );
      })}
    </Svg>
  );
}
