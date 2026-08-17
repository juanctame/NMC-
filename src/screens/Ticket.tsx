/**
 * Ticket — minted on a successful RSVP. A green "Seat saved" stamp, a perforated
 * admit-one ticket with a barcode + booking code, and routes back to the Table
 * or on to the Passport.
 */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { EVENTS, OPEN, type EventT } from '../store/data';
import { C } from '../theme/tokens';
import { Display, Banner, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Grain } from '../components/Grain';
import { StampIn } from '../components/Anim';

// Deterministic printed barcode.
const BARS = Array.from({ length: 46 }, (_, i) => ((i * 7 + 3) % 4) + 1);

function Barcode() {
  return (
    <View style={{ flex: 1, height: 34, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
      {BARS.map((w, i) => (
        <View key={i} style={{ width: w, backgroundColor: i % 2 === 0 ? C.inkBlack : 'transparent' }} />
      ))}
    </View>
  );
}

export function Ticket() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const ticketId = useStore((s) => s.ticketId);
  const createdTables = useStore((s) => s.createdTables);

  const seed: EventT[] = [...createdTables, ...OPEN, ...EVENTS];
  const ev = seed.find((e) => e.id === ticketId) || EVENTS[0];
  const when = `${ev.wd} ${ev.mo} ${ev.d} · ${ev.time}`;
  const code = `CRTQ-${ev.mo}${ev.d}-JUNE`;

  return (
    <View style={{ flex: 1, backgroundColor: C.sun400 }}>
      <Grain opacity={0.06} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24, alignItems: 'center' }}>
          <StampIn rotate="-2deg">
            <StickerView offset="sm" radius={999} style={{ backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16 }}>
              <Banner s={12} tk={0.18} c={C.greenFg}>
                Seat saved ✓
              </Banner>
            </StickerView>
          </StampIn>
          <Display s={34} c={C.inkDeep} style={{ marginTop: 16 }}>
            You’re in
          </Display>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
            <View style={{ padding: 16, borderBottomWidth: 2.5, borderColor: C.inkBlack, borderStyle: 'dashed' }}>
              <Banner s={10} tk={0.18} c={C.ink400}>
                CRTQ · admit one
              </Banner>
              <SerifDisplay s={22} c={C.inkDeep} style={{ marginTop: 4, lineHeight: 24 }}>
                {ev.title}
              </SerifDisplay>
              <Mono s={11} c={C.inkMuted} style={{ marginTop: 8 }}>
                {when}
              </Mono>
              <Mono s={11} c={C.inkMuted}>
                Meet at {ev.meet} · {ev.host}
              </Mono>
            </View>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Barcode />
              <Mono s={12} c={C.inkDeep} tk={0.06}>
                {code}
              </Mono>
            </View>
          </StickerView>
        </View>

        <Mono s={10.5} c={C.ink600} style={{ textAlign: 'center', marginHorizontal: 24, marginVertical: 10, lineHeight: 17 }}>
          Your host scans this at the door.{'\n'}We’ll nudge you 24h and 1h before.
        </Mono>

        <View style={{ flex: 1, minHeight: 12 }} />

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 8 }}>
          <StickerPressable offset="sm" radius={999} onPress={() => go('table')} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 12, backgroundColor: C.paper0 }}>
            <Banner s={12} tk={0.1} c={C.inkDeep}>
              More events
            </Banner>
          </StickerPressable>
          <StickerPressable offset="sm" radius={999} onPress={() => go('you')} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 12, backgroundColor: C.ink400 }}>
            <Banner s={12} tk={0.1} c={C.paper0}>
              Passport →
            </Banner>
          </StickerPressable>
        </View>
      </ScrollView>
    </View>
  );
}
