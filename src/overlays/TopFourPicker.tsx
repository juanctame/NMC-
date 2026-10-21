/**
 * Pick your Top 4 — a bottom sheet in two steps. Choose the restaurant (from
 * what you've ranked first, or search the city), then where it goes: which of
 * the four slots, and which category it's your favourite in. Opened from an
 * empty or filled slot on your passport, or from a restaurant's "Biggest fans"
 * ("Feature in my Top 4").
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { FAV_CATS, categoryOf, favPlace, catLabel, type FavCat } from '../data/favorites';
import type { Place } from '../store/data';
import { C } from '../theme/tokens';
import { Display, Banner, Mono, SerifDisplay, Serif } from '../components/Text';
import { StickerPressable } from '../components/Sticker';
import { VenueCover } from '../components/Cover';

const fold = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function Row({ p, note, onPress }: { p: Place; note?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`Choose ${p.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1.5, borderColor: C.ink100 }}>
      <VenueCover place={p} style={{ width: 44, height: 44, borderWidth: 2, borderColor: C.inkBlack }} crestSize={22} credit={false} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={14} c={C.inkDeep} numberOfLines={1}>
          {p.name}
        </SerifDisplay>
        <Mono s={8.5} c={C.inkMuted} numberOfLines={1}>
          {[p.hood, catLabel(categoryOf(p)), note].filter(Boolean).join(' · ')}
        </Mono>
      </View>
      <Display s={14} c={C.inkSoft}>
        →
      </Display>
    </Pressable>
  );
}

export function TopFourPicker() {
  const insets = useSafeAreaInsets();
  const picker = useStore((s) => s.topPicker);
  const close = useStore((s) => s.closeTopPicker);
  const setTopSlot = useStore((s) => s.setTopSlot);
  const topFour = useStore((s) => s.topFour);
  const ranked = useStore((s) => s.ranked);
  const nearby = useStore((s) => s.nearby);
  const nearbyById = useStore((s) => s.nearbyById);

  const initialPlace = picker?.placeId ? resolvePlace(picker.placeId, nearbyById) || favPlace(picker.placeId) : picker?.slot != null && topFour[picker.slot] ? resolvePlace(topFour[picker.slot]!.placeId, nearbyById) || favPlace(topFour[picker.slot]!.placeId) : undefined;
  const [place, setPlace] = useState<Place | undefined>(picker?.placeId ? initialPlace : undefined);
  const [slot, setSlot] = useState<number | null>(picker?.slot ?? (picker?.placeId ? Math.max(0, topFour.findIndex((t) => !t)) : null));
  const [cat, setCat] = useState<FavCat | null>(place ? categoryOf(place) : null);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const k = fold(q.trim());
    const pool = nearby.length ? nearby : [];
    const hits = k ? pool.filter((p) => fold(p.name + ' ' + p.hood + ' ' + (p.category || p.cuisine)).includes(k)) : [...pool].sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0));
    const mine = new Set(ranked.map((r) => r.id));
    return hits.filter((p) => !mine.has(p.id)).slice(0, 30);
  }, [q, nearby, ranked]);
  const mineHits = useMemo(() => {
    const k = fold(q.trim());
    return ranked.filter((p) => !k || fold(p.name + ' ' + p.hood).includes(k)).slice(0, 12);
  }, [q, ranked]);

  if (!picker) return null;
  const choose = (p: Place) => {
    setPlace(p);
    setCat(categoryOf(p));
  };
  const originalPick = picker.slot != null ? topFour[picker.slot] : null;
  const already = place ? topFour.findIndex((t) => t?.placeId === place.id) : -1;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <Pressable onPress={close} accessibilityLabel="Close" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,16,4,0.6)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: C.paper50, borderTopWidth: 3, borderColor: C.inkBlack, paddingTop: 14, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Banner s={8.5} tk={0.2} c={C.ink400}>
              Mis cuatro · Top 4
            </Banner>
            <Display s={20} c={C.inkDeep} style={{ lineHeight: 22 }}>
              {place ? 'Feature it' : slot != null ? `Your favourite Nº${slot + 1}` : 'Pick a favourite'}
            </Display>
          </View>
          <Pressable onPress={close} accessibilityLabel="Cancel" hitSlop={8}>
            <Mono s={10} c={C.inkMuted}>
              Cancel
            </Mono>
          </Pressable>
        </View>

        {!place ? (
          <>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search restaurants…"
              placeholderTextColor={C.inkSoft}
              accessibilityLabel="Search restaurants"
              style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, paddingVertical: 9, paddingHorizontal: 12, fontSize: 14, color: C.inkDeep, marginBottom: 8 }}
            />
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              {mineHits.length ? (
                <>
                  <Banner s={8.5} tk={0.16} c={C.inkMuted} style={{ marginTop: 6 }}>
                    From your log
                  </Banner>
                  {mineHits.map((p, i) => (
                    <Row key={p.id} p={p} note={`your #${ranked.indexOf(p) + 1}`} onPress={() => choose(p)} />
                  ))}
                </>
              ) : null}
              <Banner s={8.5} tk={0.16} c={C.inkMuted} style={{ marginTop: 12 }}>
                {q ? 'In the city' : 'The city’s best'}
              </Banner>
              {results.map((p) => (
                <Row key={p.id} p={p} onPress={() => choose(p)} />
              ))}
            </ScrollView>
            {originalPick ? (
              <Pressable
                onPress={() => {
                  setTopSlot(picker.slot!, null);
                  close();
                }}
                accessibilityLabel={`Remove from Nº${picker.slot! + 1}`}
                style={{ alignSelf: 'center', marginTop: 10 }}
              >
                <Mono s={10} c={C.inkMuted}>
                  Remove {initialPlace?.name || 'it'} from my Top 4
                </Mono>
              </Pressable>
            ) : null}
          </>
        ) : (
          <ScrollView style={{ maxHeight: 520 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <VenueCover place={place} style={{ width: 84, height: 84, borderWidth: 2.5, borderColor: C.inkBlack }} crestSize={32} credit={false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <SerifDisplay s={18} c={C.inkDeep} numberOfLines={2}>
                  {place.name}
                </SerifDisplay>
                <Mono s={9} c={C.inkMuted} numberOfLines={1}>
                  {[place.hood, place.category || place.cuisine, place.price].filter(Boolean).join(' · ')}
                </Mono>
                <Pressable onPress={() => setPlace(undefined)} accessibilityLabel="Change restaurant" hitSlop={6} style={{ marginTop: 4 }}>
                  <Mono s={9} c={C.ink400}>
                    Change restaurant
                  </Mono>
                </Pressable>
              </View>
            </View>

            <Banner s={8.5} tk={0.16} c={C.inkMuted} style={{ marginTop: 16, marginBottom: 7 }}>
              My favourite for…
            </Banner>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {FAV_CATS.map((c) => {
                const on = cat === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setCat(c.id)} accessibilityLabel={`Category: ${c.label}`} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, backgroundColor: on ? C.ink400 : C.paper0 }}>
                    <Banner s={8.5} tk={0.06} c={on ? C.paper0 : C.inkDeep}>
                      {c.glyph} {c.label}
                    </Banner>
                  </Pressable>
                );
              })}
            </View>

            <Banner s={8.5} tk={0.16} c={C.inkMuted} style={{ marginTop: 16, marginBottom: 7 }}>
              In slot
            </Banner>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2, 3].map((i) => {
                const occ = topFour[i] ? resolvePlace(topFour[i]!.placeId, nearbyById) || favPlace(topFour[i]!.placeId) : undefined;
                const on = slot === i;
                return (
                  <Pressable key={i} onPress={() => setSlot(i)} accessibilityLabel={`Slot Nº${i + 1}`} style={{ flex: 1, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: on ? C.sun400 : C.paper0, paddingVertical: 7, paddingHorizontal: 5, alignItems: 'center', gap: 2 }}>
                    <Display s={15} c={C.inkDeep}>
                      Nº{i + 1}
                    </Display>
                    <Mono s={7} c={C.inkMuted} numberOfLines={1}>
                      {occ ? (occ.id === place.id ? 'here now' : occ.name) : 'empty'}
                    </Mono>
                  </Pressable>
                );
              })}
            </View>
            {slot != null && topFour[slot] && topFour[slot]!.placeId !== place.id ? (
              <Serif s={11.5} c={C.inkMuted} style={{ marginTop: 6 }}>
                Replaces {(resolvePlace(topFour[slot]!.placeId, nearbyById) || favPlace(topFour[slot]!.placeId))?.name}.
              </Serif>
            ) : already >= 0 && slot != null && already !== slot ? (
              <Serif s={11.5} c={C.inkMuted} style={{ marginTop: 6 }}>
                Moves it from Nº{already + 1}.
              </Serif>
            ) : null}

            <StickerPressable
              offset="sm"
              radius={999}
              disabled={slot == null || !cat}
              onPress={() => {
                if (slot == null || !cat) return;
                setTopSlot(slot, { placeId: place.id, category: cat });
                close();
              }}
              accessibilityLabel="Feature in my Top 4"
              style={{ marginTop: 16, alignItems: 'center', backgroundColor: slot == null || !cat ? C.paper200 : C.ink400, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 12 }}
            >
              <Banner s={11} tk={0.1} c={C.paper0}>
                {slot == null ? 'Choose a slot' : `Feature as Nº${slot + 1}`}
              </Banner>
            </StickerPressable>
            {originalPick ? (
              <Pressable
                onPress={() => {
                  setTopSlot(picker.slot!, null);
                  close();
                }}
                accessibilityLabel={`Remove from Nº${picker.slot! + 1}`}
                style={{ alignSelf: 'center', marginTop: 12 }}
              >
                <Mono s={10} c={C.inkMuted}>
                  Remove from my Top 4
                </Mono>
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
