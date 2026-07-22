/**
 * Third-party "app card" embedded in message bubbles (Google Maps, Beli,
 * Splitwise, Resy, Calendar, etc.). Header dot + app name, optional title / sub
 * / quote / ranked rows, and a coloured CTA.
 */
import React from 'react';
import { View } from 'react-native';
import { C, col } from '../theme/tokens';
import { Banner, Serif, SerifItalic, SerifDisplay, Mono } from './Text';
import type { CardData } from '../store/data';

export function MessageCard({ card }: { card: CardData }) {
  const dot = col(card.dot);
  const cta = col(card.ctaColor);
  return (
    <View style={{ marginHorizontal: 10, marginBottom: 10, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, borderWidth: 1.5, borderColor: C.inkBlack }} />
        <Banner s={9} tk={0.16} c={dot}>
          {card.app}
        </Banner>
      </View>
      <View style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
        {card.title ? (
          <SerifDisplay s={15} c={C.inkDeep} style={{ lineHeight: 16 }}>
            {card.title}
          </SerifDisplay>
        ) : null}
        {card.sub ? (
          <Mono s={10} c={C.inkMuted} style={{ marginTop: 3 }}>
            {card.sub}
          </Mono>
        ) : null}
        {card.quote ? (
          <SerifItalic s={12.5} c={C.inkMuted} style={{ paddingVertical: 2 }}>
            {card.quote}
          </SerifItalic>
        ) : null}
        {card.rows
          ? card.rows.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 5, borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)' }}>
                <Serif s={13} c={C.inkDeep}>
                  {r[0]}
                </Serif>
                <Mono s={11} c={cta}>
                  {r[1]}
                </Mono>
              </View>
            ))
          : null}
      </View>
      <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)' }}>
        <Banner s={10} tk={0.12} c={cta}>
          {card.cta}
        </Banner>
      </View>
    </View>
  );
}
