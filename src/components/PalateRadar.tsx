/**
 * PalateRadar — a six-spoke radar that draws a foodie's taste shape. Grid rings
 * + spokes in faint ink, the value polygon filled sun with a thick ink outline
 * and stamped dots at each vertex, and the axis labels floated around the rim.
 * The shape is unique to each profile because it's computed from their activity.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { C } from '../theme/tokens';
import { Banner } from './Text';
import type { PalateAxis } from '../data/palate';

export function PalateRadar({
  axes,
  labels,
  size = 220,
  showLabels = true,
  fill = C.sun400,
}: {
  axes: PalateAxis[];
  labels: string[];
  size?: number;
  showLabels?: boolean;
  fill?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const n = axes.length;
  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const vertex = (i: number, r: number) => {
    const a = angleAt(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };

  const ringPts = (r: number) =>
    axes.map((_, i) => vertex(i, r).join(',')).join(' ');
  const valuePts = axes.map((ax, i) => vertex(i, R * ax.value).join(',')).join(' ');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* grid rings */}
        {[0.33, 0.66, 1].map((f) => (
          <Polygon key={f} points={ringPts(R * f)} fill="none" stroke={C.inkBlack} strokeOpacity={0.14} strokeWidth={1.5} />
        ))}
        {/* spokes */}
        {axes.map((_, i) => {
          const [x, y] = vertex(i, R);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.inkBlack} strokeOpacity={0.14} strokeWidth={1.5} />;
        })}
        {/* value shape */}
        <Polygon points={valuePts} fill={fill} fillOpacity={0.6} stroke={C.inkBlack} strokeWidth={2.5} strokeLinejoin="round" />
        {axes.map((ax, i) => {
          const [x, y] = vertex(i, R * ax.value);
          return <Circle key={i} cx={x} cy={y} r={3.5} fill={C.ink400} stroke={C.inkBlack} strokeWidth={1.5} />;
        })}
      </Svg>
      {/* axis labels floated just outside the rim */}
      {showLabels && axes.map((_, i) => {
        const a = angleAt(i);
        const outX = cx + R * 1.16 * Math.cos(a);
        const outY = cy + R * 1.16 * Math.sin(a);
        return (
          <View key={i} pointerEvents="none" style={{ position: 'absolute', left: outX - 40, top: outY - 7, width: 80, alignItems: 'center' }}>
            <Banner s={8.5} tk={0.08} c={C.inkMuted}>
              {labels[i]}
            </Banner>
          </View>
        );
      })}
    </View>
  );
}
