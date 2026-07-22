/**
 * Event detail — perforated yellow header, verified host, seat progress bar,
 * route, dietary chips, and a sticky RSVP that mints a ticket (or waitlists a
 * full table).
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { EVENTS, OPEN, type EventT } from '../store/data';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { ScreenIn } from '../components/Anim';

const DIET = ['All good', 'Vegetarian', 'No gluten', 'No shellfish'];

export function EventDetail() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const activeEventId = useStore((s) => s.activeEventId);
  const createdTables = useStore((s) => s.createdTables);
  const rsvped = useStore((s) => s.rsvped);
  const waitlisted = useStore((s) => s.waitlisted);
  const diet = useStore((s) => s.diet);
  const toggleDiet = useStore((s) => s.toggleDiet);
  const rsvp = useStore((s) => s.rsvp);

  const seed: EventT[] = [...createdTables, ...OPEN, ...EVENTS];
  const ev = seed.find((e) => e.id === activeEventId) || EVENTS[0];
  const left = ev.spots - ev.taken;
  const full = left <= 0;
  const going = !!rsvped[ev.id];
  const wait = !!waitlisted[ev.id];
  const pct = Math.round((ev.taken / ev.spots) * 100);
  const canBook = !full && !going;

  const rsvpLabel = going ? 'You’re going ✓' : full ? (wait ? 'Nº 2 on the waitlist ✓' : 'Join the waitlist') : 'Save my seat';
  const rsvpBg = going || wait ? C.stampGreen : full ? C.stampPink : C.ink400;

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Pressable onPress={() => go('table')} style={{ paddingVertical: 6 }}>
          <Banner s={11} tk={0.14} c={C.ink400}>
            ← The Table
          </Banner>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
          <View style={{ backgroundColor: C.sun400, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack, borderStyle: 'dashed', padding: 16 }}>
            <Banner s={10} tk={0.16} c={C.ink500}>
              {ev.mo} {ev.d} · {ev.wd} · {ev.time}
            </Banner>
            <Display s={26} c={C.inkDeep} style={{ marginTop: 6 }}>
              {ev.title}
            </Display>
            <Mono s={11} c={C.ink600} style={{ marginTop: 6 }}>
              {ev.route} · meet at {ev.meet}
            </Mono>
          </View>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
                <Banner s={13} c={C.greenFg}>
                  ✓
                </Banner>
              </View>
              <View>
                <Banner s={11} tk={0.1} c={C.inkDeep}>
                  {ev.host}
                </Banner>
                <Mono s={10} c={C.inkMuted}>
                  Named host on site · guest list enforced
                </Mono>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Mono s={10} c={C.inkMuted}>
                  {ev.taken} of {ev.spots} seats taken
                </Mono>
                <Mono s={10} c={C.inkMuted}>
                  {full ? 'FULL' : `${left} left`}
                </Mono>
              </View>
              <View style={{ height: 12, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper100 }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: full ? C.stampPink : C.stampGreen }} />
              </View>
            </View>

            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginTop: 16, marginBottom: 8 }}>
              The route
            </Banner>
            <View style={{ gap: 6 }}>
              {ev.menu.map((m, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                  <Display s={13} c={C.ink400}>
                    →
                  </Display>
                  <Serif s={14} style={{ flex: 1 }}>
                    {m}
                  </Serif>
                </View>
              ))}
            </View>
            <Mono s={10.5} c={C.inkMuted} style={{ marginTop: 14, lineHeight: 17 }}>
              {ev.note}
            </Mono>
          </View>
        </StickerView>

        {canBook ? (
          <>
            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginTop: 18, marginBottom: 8 }}>
              Anything we should know?
            </Banner>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIET.map((name) => {
                const on = diet.includes(name);
                return (
                  <Pressable
                    key={name}
                    onPress={() => toggleDiet(name)}
                    style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: on ? C.sun400 : C.paper0 }}
                  >
                    <Banner s={10} tk={0.1} c={C.inkDeep}>
                      {name}
                    </Banner>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper100 }}>
        <StickerPressable offset="sm" radius={999} onPress={rsvp} style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 14, backgroundColor: rsvpBg }}>
          <Banner s={14} tk={0.1} c={C.paper0}>
            {rsvpLabel}
          </Banner>
        </StickerPressable>
      </View>
    </ScreenIn>
  );
}
