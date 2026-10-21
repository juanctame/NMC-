/**
 * Another foodie's profile — a friend, or any other CRTQ tester you meet among a
 * restaurant's biggest fans. Their Top 4 leads the header card, then their
 * favourite in each category (with the shortlist behind it), the chefs they
 * follow, their archetype + palate radar and flavour DNA,
 * and how closely their palate matches yours. Follow them right from here.
 *
 * Friends' palates come from their taste leans; another tester's is read from
 * the restaurants they've crowned (their published favourites, loaded from the
 * shared backend by handle).
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { FRIENDS } from '../store/data';
import { friendFavs, favPlace, FAV_CATS, fetchPersonFavs, chefsFollowedBy, type PersonFavs } from '../data/favorites';
import { Monogram } from '../components/Monogram';
import { ReviewMap, ReviewMapHeading, type MapReview } from '../components/ReviewMap';
import { Image } from 'expo-image';
import { ActivityIndicator } from 'react-native';
import { TopFourGrid } from '../components/TopFour';
import { identity } from '../data/profile';
import { computePalate, friendPalate, tasteMatch, PALATE_AXES } from '../data/palate';
import { C, col } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { PalateRadar } from '../components/PalateRadar';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

export function FoodieProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeFoodieId);
  const closeFoodie = useStore((s) => s.closeFoodie);
  const openPlace = useStore((s) => s.openPlace);
  const openChef = useStore((s) => s.openChef);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const profile = useStore((s) => s.profile);
  const t = useT();

  const friendRow = FRIENDS.find((f) => f.id === id);
  const handleId = id?.startsWith('h:') ? id.slice(2) : null;
  const [remote, setRemote] = useState<PersonFavs | null | 'loading'>(handleId ? 'loading' : null);
  useEffect(() => {
    if (!handleId) return;
    let live = true;
    setRemote('loading');
    fetchPersonFavs(handleId).then((r) => live && setRemote(r));
    return () => {
      live = false;
    };
  }, [handleId]);

  const favs: PersonFavs | undefined = friendRow ? friendFavs(friendRow.id) : remote && remote !== 'loading' ? remote : undefined;
  // One shape for a friend and for any other tester.
  const friend = friendRow
    ? { ...friendRow, avatarUrl: undefined as string | undefined, handle: '@' + friendRow.name.split(' ')[0].toLowerCase(), line: `Sample diner · ${friendRow.year} ${t('foodie.placesYear')}` }
    : favs
      ? {
          id: favs.person.id,
          name: favs.person.name,
          initials: favs.person.initials,
          color: favs.person.color,
          avatarUrl: favs.person.avatarUrl,
          handle: handleId!,
          line: 'CRTQ tester',
        }
      : null;
  if (!friend) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper50, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        {remote === 'loading' ? <ActivityIndicator color={C.ink400} /> : <Serif s={14} c={C.inkMuted}>This profile isn’t available right now.</Serif>}
        <Pressable onPress={closeFoodie} accessibilityLabel="Back">
          <Mono s={10} c={C.ink400}>
            ← Back
          </Mono>
        </Pressable>
      </View>
    );
  }

  // A friend's palate from their taste lean; a tester's from the places they've crowned.
  const crowned = favs ? [...new Set([...Object.values(favs.favorites), ...favs.top.filter(Boolean).map((x) => x!.placeId)])].map((pid) => favPlace(pid as string)).filter(Boolean) : [];
  const palate = friendRow ? friendPalate(friendRow) : computePalate(crowned as NonNullable<(typeof crowned)[number]>[]);
  const mine = computePalate(ranked, tastes, userReviews);
  const match = tasteMatch(mine, palate);
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));
  const following = !!follows[friend.id];
  const handle = friend.handle;
  const me = identity(profile);
  const first = friend.name.split(' ')[0];
  const followed = friendRow ? chefsFollowedBy(friendRow.id) : [];
  const dnaTotal = palate.topCuisines.reduce((sum, c) => sum + c.count, 0) || 1;

  const matchColor = match >= 80 ? C.stampGreen : match >= 60 ? C.sun500 : C.ink400;
  // Their map: each category's shortlist, best first (their favourite is #1 there).
  const mapItems: MapReview[] = favs
    ? FAV_CATS.flatMap((fc) => (favs.loves?.[fc.id] || (favs.favorites[fc.id] ? [favs.favorites[fc.id]!] : [])).map((pid) => favPlace(pid)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ place: p, cat: fc.id })))
    : [];

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* header card */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pressable onPress={closeFoodie} accessibilityLabel="Back" style={{ paddingRight: 8, paddingVertical: 4 }}>
              <Display s={20} c={C.ink400}>
                ←
              </Display>
            </Pressable>
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              {t('foodie.title')}
            </Banner>
          </View>

          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: col(friend.color), borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {friend.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Banner s={18} c={C.paper0}>
                      {friend.initials}
                    </Banner>
                  )}
                </View>
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Display s={22} c={C.paper0} numberOfLines={1}>
                  {friend.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }}>
                  {handle} · {friend.line}
                </Mono>
              </View>
            </View>
            {/* their Top 4 — the first thing on their profile */}
            {favs ? (
              <View style={{ marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 12 }} accessibilityLabel={`${friend.name.split(' ')[0]}'s Top 4`}>
                <Banner s={9} tk={0.18} c={C.sun300} style={{ marginBottom: 8 }}>
                  {friend.name.split(' ')[0]}'s Top 4
                </Banner>
                <TopFourGrid top={favs.top} owner={friend.name.split(' ')[0]} variant="row" dark />
              </View>
            ) : null}
            {/* match with you */}
            {profile ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 14 }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: matchColor, borderWidth: 2.5, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] }}>
                  <Display s={19} c={C.paper0}>
                    {match}
                  </Display>
                </View>
                <View style={{ flex: 1 }}>
                  <Banner s={11} tk={0.1} c={C.paper0}>
                    {t('foodie.match')}
                  </Banner>
                  <Serif s={12.5} c={C.ink100} style={{ marginTop: 3, lineHeight: 18 }}>
                    {me.name.split(' ')[0]} · {friend.name.split(' ')[0]}
                  </Serif>
                </View>
                <StickerPressable offset="sm" radius={999} onPress={() => toggleFollow(friend.id)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.sun400, paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Banner s={10} tk={0.1} c={following ? C.greenFg : C.inkDeep}>
                    {following ? t('foodie.following') : t('foodie.follow')}
                  </Banner>
                </StickerPressable>
              </View>
            ) : null}
          </StickerView>
        </View>

        {/* their map: the places they love, category by category */}
        {mapItems.length ? (
          <View style={{ paddingTop: 20, gap: 8 }}>
            <ReviewMapHeading title={`${first}'s map`} note={`${mapItems.length} places`} />
            <ReviewMap who={`${first}'s`} items={mapItems} cats={FAV_CATS.map((x) => ({ id: x.id, label: x.label }))} />
          </View>
        ) : null}

        {/* their favourite in each category (their Top 4 leads the header card) */}
        {favs ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <View style={{ gap: 6 }}>
              <Banner s={9} tk={0.16} c={C.inkMuted}>
                Favourite in each category
              </Banner>
              {FAV_CATS.filter((c) => favs.favorites[c.id]).map((c) => {
                const p = favPlace(favs.favorites[c.id]!);
                if (!p) return null;
                const also = (favs.loves?.[c.id] || []).slice(1).map((id) => favPlace(id)).filter((x): x is NonNullable<typeof x> => !!x);
                return (
                  <View key={c.id} style={{ paddingVertical: 6, borderBottomWidth: 1.5, borderColor: C.ink100 }}>
                    <Pressable onPress={() => openPlace(p.id)} accessibilityLabel={`${first}'s favourite ${c.label}: ${p.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Display s={12} c={C.ink400} style={{ width: 18, textAlign: 'center' }}>
                        {c.glyph}
                      </Display>
                      <Mono s={9} c={C.inkMuted} style={{ width: 118 }} numberOfLines={1}>
                        {c.label}
                      </Mono>
                      <Serif s={13.5} c={C.inkDeep} numberOfLines={1} style={{ flex: 1 }}>
                        {p.name}
                      </Serif>
                      <Display s={12} c={C.inkSoft}>
                        →
                      </Display>
                    </Pressable>
                    {also.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5, marginLeft: 26 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
                        {also.map((q, i) => (
                          <Pressable
                            key={q.id}
                            onPress={() => openPlace(q.id)}
                            accessibilityLabel={`${first}'s Nº${i + 2} ${c.label}: ${q.name}`}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: C.ink100, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: C.paper0 }}
                          >
                            <Mono s={7.5} c={C.ink400}>
                              Nº{i + 2}
                            </Mono>
                            <Mono s={8.5} c={C.inkDeep} numberOfLines={1}>
                              {q.name}
                            </Mono>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* the chefs they follow */}
        {followed.length ? (
          <View style={{ paddingTop: 20 }} accessibilityLabel="Chefs they follow">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8, paddingHorizontal: 16 }}>
              <Banner s={9} tk={0.16} c={C.inkMuted}>
                Chefs {first} follows
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
              <Mono s={9} c={C.inkSoft}>
                {followed.length}
              </Mono>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 6 }}>
              {followed.map((ch) => (
                <StickerPressable
                  key={ch.id}
                  offset="sm"
                  onPress={() => openChef(ch.id)}
                  accessibilityLabel={`Chef: ${ch.name}`}
                  style={{ width: 112, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 9, alignItems: 'center', gap: 6 }}
                >
                  <Monogram name={ch.name} size={40} rot="-5deg" />
                  <Banner s={8.5} tk={0.03} c={C.inkDeep} numberOfLines={2} style={{ textAlign: 'center' }}>
                    {ch.name}
                  </Banner>
                  <Mono s={7} c={C.inkMuted} numberOfLines={1}>
                    {ch.placeIds.length > 1 ? `${ch.placeIds.length} restaurants` : favPlace(ch.placeIds[0])?.name || ''}
                  </Mono>
                </StickerPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* archetype + radar */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 16, overflow: 'hidden' }}>
            <Grain opacity={0.05} />
            <Display s={24} c={C.ink400} style={{ lineHeight: 25 }}>
              {t('arch.' + palate.archId + '.t')}
            </Display>
            <SerifItalic s={13} c={C.inkMuted} style={{ marginTop: 5, lineHeight: 19 }}>
              {t('arch.' + palate.archId + '.b')}
            </SerifItalic>
            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <PalateRadar axes={palate.axes} labels={axisLabels} size={228} />
            </View>
          </StickerView>
        </View>

        {/* flavor DNA */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            {t('you.flavorDna')}
          </Banner>
          <View style={{ flexDirection: 'row', height: 18, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
            {palate.topCuisines.map((c, i) => (
              <View key={c.name} style={{ width: `${(c.count / dnaTotal) * 100}%`, backgroundColor: c.color, borderRightWidth: i < palate.topCuisines.length - 1 ? 2 : 0, borderColor: C.inkBlack }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11 }}>
            {palate.topCuisines.map((c) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c.color, borderWidth: 1.5, borderColor: C.inkBlack }} />
                <Banner s={9.5} tk={0.04} c={C.inkDeep}>
                  {c.name}
                </Banner>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
