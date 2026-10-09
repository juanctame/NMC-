/**
 * Chef profile — the person (or team) behind the plates. Opened from a place's
 * "From the guide" card or the feed's chefs rail. When the guide credits the
 * same chef at several restaurants, they're all gathered here under one profile
 * (the linking the brief asked for), so you can see a chef's whole CDMX footprint
 * and jump straight into any of their rooms.
 *
 * Everything shown — name, restaurants, awards — comes from the curated guide
 * dataset; the circular mark is an original monogram (we don't re-host logos).
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { chefById, placesOfChef, guideBadgeOf } from '../data/chefs';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifDisplay, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';
import type { Place } from '../store/data';

/** One of the chef's restaurants — tap through to its full profile. */
function ChefPlaceRow({ place, onOpen }: { place: Place; onOpen: () => void }) {
  const badge = guideBadgeOf(place);
  return (
    <StickerPressable
      offset="sm"
      onPress={onOpen}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 11 }}
    >
      <Monogram name={place.name} size={44} rot="-4deg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={16} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
          {place.name}
        </SerifDisplay>
        <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
          {place.category || place.cuisine} · {place.hood}
        </Mono>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {badge ? (
            <View style={{ backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
              <Banner s={7.5} tk={0.06} c={C.paper0}>
                {badge}
              </Banner>
            </View>
          ) : null}
          {typeof place.acclaim === 'number' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={8} c={C.sun600}>
                ◆ {place.acclaim}
              </Banner>
            </View>
          ) : null}
          {place.moment === 'Apertura 2026' ? (
            <View style={{ backgroundColor: C.stampGreen, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={7.5} tk={0.06} c={C.paper0}>
                New · 2026
              </Banner>
            </View>
          ) : null}
        </View>
      </View>
      <Display s={18} c={C.inkSoft}>
        →
      </Display>
    </StickerPressable>
  );
}

export function ChefProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeChefId);
  const closeChef = useStore((s) => s.closeChef);
  const openPlace = useStore((s) => s.openPlace);

  const chef = chefById(id);
  if (!chef) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;

  const places = placesOfChef(chef);
  const multi = places.length > 1;
  const soloHood = chef.hoods[0];
  const footprint = multi
    ? `Behind ${places.length} restaurants in Mexico City`
    : soloHood
      ? `Chef at ${places[0]?.name || 'this kitchen'} · ${soloHood}`
      : `Chef at ${places[0]?.name || 'this kitchen'}`;

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pressable onPress={closeChef} style={{ paddingRight: 8, paddingVertical: 4 }}>
              <Display s={20} c={C.ink400}>
                ←
              </Display>
            </Pressable>
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              The chef
            </Banner>
          </View>

          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Monogram name={chef.name} size={60} fg={C.paper0} />
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Display s={22} c={C.paper0} style={{ lineHeight: 23 }}>
                  {chef.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 5 }} numberOfLines={2}>
                  {footprint}
                </Mono>
              </View>
            </View>
            {/* top award + acclaim */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 14, flexWrap: 'wrap' }}>
              {chef.topAward ? (
                <View style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}>
                  <Banner s={10} tk={0.08} c={C.inkDeep}>
                    {chef.topAward}
                  </Banner>
                </View>
              ) : null}
              {chef.acclaim > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,245,229,0.12)', borderWidth: 1.5, borderColor: C.paper0, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={9.5} c={C.sun300}>
                    ◆ {chef.acclaim}
                  </Banner>
                  <Mono s={8} c={C.ink100}>
                    acclaim
                  </Mono>
                </View>
              ) : null}
            </View>
          </StickerView>
        </View>

        {/* what they cook */}
        {chef.cuisines.length ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
              What they cook
            </Banner>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {chef.cuisines.map((c) => (
                <View key={c} style={{ backgroundColor: C.sun100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={9} tk={0.03} c={C.inkDeep}>
                    {c}
                  </Banner>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* their restaurants */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              {multi ? 'Their restaurants' : 'The restaurant'}
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            <Mono s={9} c={C.inkSoft}>
              {places.length}
            </Mono>
          </View>
          <View style={{ gap: 10 }}>
            {places.map((p) => (
              <ChefPlaceRow key={p.id} place={p} onOpen={() => openPlace(p.id)} />
            ))}
          </View>
        </View>

        {/* honest provenance */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <SerifItalic s={11.5} c={C.inkSoft} style={{ lineHeight: 17 }}>
            {multi
              ? 'Linked across the venues the CRTQ CDMX guide credits to the same chef or kitchen team.'
              : 'From the CRTQ CDMX guide. The circular mark is an original CRTQ monogram, not the restaurant’s own logo.'}
          </SerifItalic>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
