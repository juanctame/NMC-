/**
 * Restaurant group profile (grupo restaurantero) — the business family behind
 * several rooms. Opened from a place's "From the guide" card, a chef profile, or
 * the feed's groups rail. Gathers every venue the guide ties together (named
 * groups like Grupo Castellano, or sister restaurants like Rosetta & Bella
 * Aurora), the chefs cooking across them, sister venues the guide names but
 * doesn't list, and — so the link is never a guess — the guide's own words.
 *
 * The cover is a mosaic of the group's restaurants (real photos where we have
 * them, otherwise each venue's distinct generated cover); the crest is an
 * original monogram, not a logo.
 */
import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { groupById, placesOfGroup } from '../data/groups';
import { chefById } from '../data/chefs';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { PlaceCover } from '../components/Cover';
import { VenueRow } from '../components/VenueRow';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

function SectionHead({ label, count, dot = C.ink400 }: { label: string; count?: number; dot?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {label}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {count != null ? (
        <Mono s={9} c={C.inkSoft}>
          {count}
        </Mono>
      ) : null}
    </View>
  );
}

export function GroupProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeGroupId);
  const closeGroup = useStore((s) => s.closeGroup);
  const openPlace = useStore((s) => s.openPlace);
  const openChef = useStore((s) => s.openChef);
  const venuePhotos = useStore((s) => s.venuePhotos);
  const livePhotos = useStore((s) => s.livePhotos);
  const ensureVenuePhoto = useStore((s) => s.ensureVenuePhoto);

  const group = groupById(id);
  const places = group ? placesOfGroup(group) : [];

  // Let real venue photos fill in the cover mosaic where they exist.
  useEffect(() => {
    if (group) placesOfGroup(group).forEach((p) => ensureVenuePhoto(p));
  }, [group, ensureVenuePhoto]);

  if (!group) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;

  const n = places.length;
  const named = group.kind === 'named';
  const footprint =
    `${n} ${n === 1 ? 'restaurant' : 'restaurants'} in this guide` +
    (group.also.length ? ` · ${group.also.length} more beyond it` : '');
  const chefs = group.chefIds.map((cid) => chefById(cid)).filter((c): c is NonNullable<typeof c> => !!c);
  const evidence = group.evidence.filter((e, i, a) => a.findIndex((x) => x.text === e.text) === i);
  const nameOf = (pid: string) => places.find((p) => p.id === pid)?.name || '';
  const mosaic = places.slice(0, 3);

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* cover — a mosaic of the group's restaurants */}
        <View style={{ position: 'relative', flexDirection: 'row', height: 190, borderBottomWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
          {mosaic.map((p, i) => (
            <PlaceCover
              key={p.id}
              place={p}
              photoUrl={livePhotos[p.id]?.photoUrl || venuePhotos[p.id]?.url}
              style={{ flex: 1, height: '100%', borderLeftWidth: i ? 2.5 : 0, borderColor: C.inkBlack }}
              crestSize={mosaic.length === 1 ? 84 : mosaic.length === 2 ? 58 : 46}
            />
          ))}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <StickerView offset="sm" radius={999}>
              <Pressable onPress={closeGroup} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Display s={18} c={C.ink400}>
                  ←
                </Display>
              </Pressable>
            </StickerView>
          </View>
          <View style={{ position: 'absolute', left: 12, bottom: 10, backgroundColor: named ? C.sun400 : C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: '-3deg' }] }}>
            <Banner s={9} tk={0.12} c={C.inkDeep}>
              {named ? 'Restaurant group' : 'Restaurant family'}
            </Banner>
          </View>
        </View>

        {/* header */}
        <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Monogram name={group.crest} size={60} fg={C.paper0} />
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Display s={22} c={C.paper0} style={{ lineHeight: 23 }}>
                  {group.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 5 }} numberOfLines={2}>
                  {footprint}
                </Mono>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 14, flexWrap: 'wrap' }}>
              {group.topAward ? (
                <View style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}>
                  <Banner s={10} tk={0.08} c={C.inkDeep}>
                    {group.topAward}
                  </Banner>
                </View>
              ) : null}
              {group.acclaim > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,245,229,0.12)', borderWidth: 1.5, borderColor: C.paper0, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={9.5} c={C.sun300}>
                    ◆ {group.acclaim}
                  </Banner>
                  <Mono s={8} c={C.ink100}>
                    best acclaim
                  </Mono>
                </View>
              ) : null}
              {group.hoods.length ? (
                <Mono s={8.5} c={C.ink100} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {group.hoods.join(' · ')}
                </Mono>
              ) : null}
            </View>
          </StickerView>
        </View>

        {/* what they serve */}
        {group.cuisines.length ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
              What they serve
            </Banner>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {group.cuisines.map((c) => (
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
          <SectionHead label={n === 1 ? 'The restaurant' : 'Their restaurants'} count={n} />
          <View style={{ gap: 10 }}>
            {places.map((p) => (
              <VenueRow key={p.id} place={p} onOpen={() => openPlace(p.id)} />
            ))}
          </View>
        </View>

        {/* sister venues the guide names but doesn't list */}
        {group.also.length ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <SectionHead label="Also in the family" dot={C.sun400} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {group.also.map((name) => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderStyle: 'dashed', borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 11 }}>
                  <Monogram name={name} size={24} />
                  <Serif s={12.5} c={C.inkDeep}>
                    {name}
                  </Serif>
                </View>
              ))}
            </View>
            <Mono s={8} c={C.inkSoft} style={{ marginTop: 6 }}>
              Named by the guide · not reviewed in it
            </Mono>
          </View>
        ) : null}

        {/* the chefs cooking across the group */}
        {chefs.length ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <SectionHead label={chefs.length === 1 ? 'The chef' : 'The chefs'} count={chefs.length} />
            <View style={{ gap: 8 }}>
              {chefs.map((c) => (
                <StickerPressable
                  key={c.id}
                  offset="sm"
                  onPress={() => openChef(c.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 8, paddingHorizontal: 10 }}
                >
                  <Monogram name={c.name} size={34} rot="-4deg" />
                  <Serif s={13.5} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                    {c.name}
                  </Serif>
                  <Mono s={8.5} c={C.inkMuted}>
                    {c.placeIds.length > 1 ? `${c.placeIds.length} restaurants` : 'chef'} →
                  </Mono>
                </StickerPressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* why they're linked — the guide's own words */}
        {evidence.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <SectionHead label="Why they're linked" dot={C.stampGreen} />
            <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 13, gap: 11 }}>
              {evidence.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 9 }}>
                  <View style={{ width: 3, borderRadius: 2, backgroundColor: C.stampGreen }} />
                  <View style={{ flex: 1 }}>
                    <SerifItalic s={12.5} c={C.inkDeep} style={{ lineHeight: 18 }}>
                      “{e.text}”
                    </SerifItalic>
                    <Mono s={8} c={C.inkSoft} style={{ marginTop: 3 }}>
                      — on {nameOf(e.placeId)}
                    </Mono>
                  </View>
                </View>
              ))}
            </StickerView>
          </View>
        ) : null}

        {/* honest provenance */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <SerifItalic s={11.5} c={C.inkSoft} style={{ lineHeight: 17 }}>
            {named
              ? 'Grouped as the CRTQ CDMX guide names them. Only venues the guide itself ties together are linked.'
              : 'Sister restaurants the CRTQ CDMX guide ties together. We describe them by their flagship rather than invent a company name.'}
          </SerifItalic>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
