/**
 * Create-a-table bottom sheet: pick place → time → seats → visibility
 * (Public / Friends only) → summary → open it (you host).
 */
import React from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { byId, WHEN_OPTS } from '../store/data';
import { C } from '../theme/tokens';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

const PLACE_IDS = ['lardo', 'contramar', 'orinoco', 'rosetta', 'maximo'];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginTop: 18, marginBottom: 8 }}>
      {children}
    </Banner>
  );
}

export function CreateTable() {
  const insets = useSafeAreaInsets();
  const closeCreate = useStore((s) => s.closeCreate);
  const mode = useStore((s) => s.createMode);
  const cPlaceId = useStore((s) => s.cPlaceId);
  const cWhen = useStore((s) => s.cWhen);
  const cSeats = useStore((s) => s.cSeats);
  const cVisibility = useStore((s) => s.cVisibility);
  const cTitle = useStore((s) => s.cTitle);
  const cDesc = useStore((s) => s.cDesc);
  const setCreate = useStore((s) => s.setCreate);
  const setVisibility = useStore((s) => s.setVisibility);
  const createTable = useStore((s) => s.createTable);

  const isEvent = mode === 'event';
  const cPlace = byId[cPlaceId];
  const summary = isEvent
    ? `${cTitle.trim() || 'Untitled event'} · ${cPlace ? cPlace.name : ''} · ${cWhen} · ${cSeats} seats`
    : `Table for ${cSeats} · ${cPlace ? cPlace.name : ''} · ${cWhen} · ${cVisibility === 'private' ? 'friends only' : 'public'}`;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55 }}>
      <Pressable onPress={closeCreate} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.55)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ maxHeight: '88%', backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Display s={24} c={C.inkDeep}>
                  {isEvent ? 'Host an event' : 'Open a table'}
                </Display>
                {isEvent ? (
                  <View style={{ backgroundColor: C.ink400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, transform: [{ rotate: '-3deg' }] }}>
                    <Banner s={8} tk={0.12} c={C.paper0}>
                      CRITIC
                    </Banner>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={closeCreate}>
                <Mono s={12} c={C.inkMuted}>
                  Close ✕
                </Mono>
              </Pressable>
            </View>
            <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 3 }}>
              {isEvent
                ? 'Curate a night at a restaurant — your verified event goes on the community calendar.'
                : 'Pick a spot, a time, and how many seats. The community fills the rest.'}
            </SerifItalic>

            {isEvent ? (
              <>
                <Label>Event name</Label>
                <TextInput
                  value={cTitle}
                  onChangeText={(v) => setCreate({ cTitle: v } as any)}
                  placeholder="e.g. Late-night suadero crawl"
                  placeholderTextColor={C.inkSoft}
                  style={{ fontFamily: 'Fraunces_400Regular', fontSize: 15, paddingVertical: 11, paddingHorizontal: 12, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, color: C.inkBlack }}
                />
                <Label>What’s the night about?</Label>
                <TextInput
                  value={cDesc}
                  onChangeText={(v) => setCreate({ cDesc: v } as any)}
                  placeholder="Tell diners what to expect — the menu, the vibe, why you’re hosting."
                  placeholderTextColor={C.inkSoft}
                  multiline
                  style={{ minHeight: 76, textAlignVertical: 'top', fontFamily: 'Fraunces_400Regular', fontSize: 14, lineHeight: 20, padding: 12, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, color: C.inkBlack }}
                />
              </>
            ) : null}

            <Label>Where</Label>
            <View style={{ gap: 8 }}>
              {PLACE_IDS.map((id) => {
                const p = byId[id];
                const on = cPlaceId === id;
                return (
                  <StickerPressable
                    key={id}
                    offset="sm"
                    onPress={() => setCreate({ cPlaceId: id } as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: on ? C.sun400 : C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 13 }}
                  >
                    <View>
                      <SerifDisplay s={15} c={C.inkDeep} style={{ lineHeight: 16 }}>
                        {p.name}
                      </SerifDisplay>
                      <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                        {p.hood}
                      </Mono>
                    </View>
                    {on ? (
                      <Display s={16} c={C.ink400}>
                        ✓
                      </Display>
                    ) : null}
                  </StickerPressable>
                );
              })}
            </View>

            <Label>When</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WHEN_OPTS.map((w) => {
                const on = cWhen === w.label;
                return (
                  <Pressable
                    key={w.label}
                    onPress={() => setCreate({ cWhen: w.label } as any)}
                    style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: on ? C.sun400 : C.paper0 }}
                  >
                    <Banner s={10} tk={0.08} c={C.inkDeep}>
                      {w.label}
                    </Banner>
                  </Pressable>
                );
              })}
            </View>

            <Label>Seats</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[4, 6, 8].map((n) => {
                const on = cSeats === n;
                return (
                  <StickerPressable
                    key={n}
                    offset="sm"
                    radius={6}
                    onPress={() => setCreate({ cSeats: n } as any)}
                    style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 6, paddingVertical: 10, backgroundColor: on ? C.sun400 : C.paper0 }}
                  >
                    <Display s={20} c={C.inkDeep}>
                      {n}
                    </Display>
                  </StickerPressable>
                );
              })}
            </View>

            <Label>Who can join</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StickerPressable
                offset="sm"
                radius={6}
                onPress={() => setVisibility('public')}
                style={{ flex: 1, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: cVisibility === 'public' ? C.sun400 : C.paper0 }}
              >
                <Banner s={11} tk={0.08} c={C.inkDeep}>
                  Public
                </Banner>
                <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
                  Anyone can join
                </Mono>
              </StickerPressable>
              <StickerPressable
                offset="sm"
                radius={6}
                onPress={() => setVisibility('private')}
                style={{ flex: 1, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: cVisibility === 'private' ? C.sun400 : C.paper0 }}
              >
                <Banner s={11} tk={0.08} c={C.inkDeep}>
                  Friends only
                </Banner>
                <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
                  Mutual follows
                </Mono>
              </StickerPressable>
            </View>

            <Mono s={10.5} c={C.inkMuted} style={{ textAlign: 'center', marginTop: 16, marginBottom: 10 }}>
              {summary}
            </Mono>
            <StickerPressable offset="sm" radius={999} onPress={createTable} style={{ alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 14, backgroundColor: isEvent ? C.ink400 : C.stampGreen }}>
              <Banner s={14} tk={0.1} c={C.paper0}>
                {isEvent ? 'Publish event → you host' : 'Open it → you host'}
              </Banner>
            </StickerPressable>
          </ScrollView>
        </SheetUp>
      </View>
    </View>
  );
}
