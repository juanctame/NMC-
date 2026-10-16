/**
 * Chef profile — the person (or team) behind the plates, as a full dossier.
 *
 *  - a portrait cover (Wikipedia, else Commons, else their own dining room) and
 *    the header: name, Wikipedia's one-line description, their footprint, top
 *    award, acclaim and a numbers row (restaurants · colonias · spend · awards);
 *  - About: their Wikipedia introduction (credited, linked) — only when the
 *    article is about a cook, so a namesake never lends their story;
 *  - Pictures: photos of them on Wikimedia Commons, then their dining rooms;
 *  - Known for: signature dishes from the guide, with the kitchen each is from;
 *  - Awards & recognition: every distinction across their restaurants;
 *  - In the guide's words: what the guide says about each kitchen;
 *  - On camera: creator clips of their restaurants, the ones that name them first;
 *  - What critics say: creators' takes on their kitchens (CRTQ's SIM reading);
 *  - Fans of their kitchens: people whose favourites are their restaurants —
 *    each a profile you can visit;
 *  - what they cook, the group(s) they cook within, and their restaurants.
 *
 * Names, restaurants, dishes and awards come from the curated guide; pictures
 * and biography from Wikipedia / Commons with credit; nothing is invented.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { chefById, chefDossier, chefPeople, mentionsChef, guideBadgeOf } from '../data/chefs';
import { groupsForChef } from '../data/groups';
import { resolveChefBio, resolveChefCommons, type ChefBio, type WikiImgResolved } from '../data/wikiPhotos';
import { collectedClips } from '../data/clips';
import { takesForPlace } from '../data/critics';
import { chefBackers, lovesFromRanked, catLabel, favPlace, type ChefBacker } from '../data/favorites';
import { FanChip } from '../components/FanChip';
import { SOURCE_LABEL } from '../data/videos';
import { identity } from '../data/profile';
import { C, col } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { VenueRow } from '../components/VenueRow';
import { VenueCover } from '../components/Cover';
import { Photo } from '../components/Photo';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';
import { SimTag, VerdictStamp } from '../components/CriticMarks';
import { PlayIcon } from '../components/icons';

/** Why someone backs the chef: "Fav fine dining · Pujol", "Nº3 seafood", "Top 4 Nº1". */
function backerLine(b: ChefBacker, multi: boolean): string {
  const place = multi ? ` · ${favPlace(b.placeId)?.name || ''}` : '';
  const cat = catLabel(b.category).toLowerCase();
  if (b.featured) return `Top 4 · ${cat}${place}`;
  return (b.rank === 1 ? `Fav ${cat}` : `Nº${b.rank} ${cat}`) + place;
}

function Head({ label, right, dot = C.ink400 }: { label: string; right?: string; dot?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {label}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {right ? (
        <Mono s={9} c={C.inkSoft}>
          {right}
        </Mono>
      ) : null}
    </View>
  );
}

/** Compact pesos for the stats row: 450 → 450, 1500 → 1.5k. */
const kilo = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${n}`);

export function ChefProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeChefId);
  const closeChef = useStore((s) => s.closeChef);
  const openPlace = useStore((s) => s.openPlace);
  const openGroup = useStore((s) => s.openGroup);
  const openClips = useStore((s) => s.openClips);
  const openCritic = useStore((s) => s.openCritic);
  const chefPhotos = useStore((s) => s.chefPhotos);
  const ensureChefPhoto = useStore((s) => s.ensureChefPhoto);
  const ranked = useStore((s) => s.ranked);
  const topFour = useStore((s) => s.topFour);
  const profile = useStore((s) => s.profile);

  const chef = chefById(id);
  const person = chef ? chefPeople(chef)[0] || chef.name : '';
  const [bio, setBio] = useState<ChefBio | null>(null);
  const [pics, setPics] = useState<WikiImgResolved[]>([]);
  const [more, setMore] = useState(false);

  // Their portrait, biography and Commons photos (Wikipedia / Commons; fill in when found).
  useEffect(() => {
    if (!chef) return;
    let live = true;
    ensureChefPhoto({ id: chef.id, name: person });
    resolveChefBio(person).then((b) => live && setBio(b));
    resolveChefCommons(person).then((p) => live && setPics(p));
    return () => {
      live = false;
    };
  }, [chef, person, ensureChefPhoto]);

  const dossier = useMemo(() => (chef ? chefDossier(chef) : null), [chef]);
  const me = identity(profile);
  // Fans (crown, feature, top-three or follow one of their kitchens) and supporters (further down a shortlist).
  const backers = useMemo(() => {
    if (!chef) return { fans: [] as ChefBacker[], supporters: [] as ChefBacker[] };
    const mine = { fan: { id: 'me', name: 'You', initials: me.initials, color: me.color, avatarUrl: me.avatarUrl, kind: 'me' as const }, loves: lovesFromRanked(ranked), top: topFour };
    return chefBackers(chef, mine);
  }, [chef, ranked, topFour, me.initials, me.color, me.avatarUrl]);

  if (!chef || !dossier) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;
  const { places } = dossier;
  const portrait = chefPhotos[chef.id] || (pics[0] ? { url: pics[0].url, attr: pics[0].attr } : null);
  const chefGroups = groupsForChef(chef.id);
  const multi = places.length > 1;
  const footprint = multi
    ? `Behind ${places.length} restaurants in Mexico City`
    : `Chef at ${places[0]?.name || 'this kitchen'}${chef.hoods[0] ? ' · ' + chef.hoods[0] : ''}`;
  const description = bio?.extract.split(/(?<=\.)\s/)[0];

  // Clips of their restaurants; the ones that name them lead.
  const clips = places
    .flatMap((p) => (collectedClips(p.id) || []).filter((c) => !c.src && (!c.scope || c.scope === 'venue')).map((c) => ({ c, p, featuring: mentionsChef(dossier, c.caption, c.creator) })))
    .sort((a, b) => Number(b.featuring) - Number(a.featuring) || (b.c.score || 0) - (a.c.score || 0))
    .filter((x, i, arr) => arr.findIndex((y) => y.c.id === x.c.id) === i)
    .slice(0, 8);
  const takes = places
    .flatMap((p) => takesForPlace(p.id).map((t) => ({ ...t, p })))
    .sort((a, b) => b.take.score - a.take.score)
    .slice(0, 5);

  const stats: [string, string][] = [
    [String(places.length), places.length === 1 ? 'restaurant' : 'restaurants'],
    [String(chef.hoods.length), chef.hoods.length === 1 ? 'colonia' : 'colonias'],
    ...(dossier.spend ? ([[dossier.spend.lo === dossier.spend.hi ? `$${kilo(dossier.spend.lo)}` : `$${kilo(dossier.spend.lo)}–${kilo(dossier.spend.hi)}`, 'per person']] as [string, string][]) : []),
    [String(dossier.awards.length), dossier.awards.length === 1 ? 'distinction' : 'distinctions'],
  ];

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* cover: their portrait, else their dining room */}
        <View style={{ position: 'relative', height: 230, borderBottomWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
          {portrait ? (
            <Photo source={{ uri: portrait.url }} style={{ width: '100%', height: '100%' }} darken={0.16} />
          ) : places[0] ? (
            <VenueCover place={places[0]} style={{ width: '100%', height: '100%' }} crestSize={70} darken={0.32} credit={false} />
          ) : null}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <StickerView offset="sm" radius={999}>
              <Pressable onPress={closeChef} accessibilityLabel="Back" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Display s={18} c={C.ink400}>
                  ←
                </Display>
              </Pressable>
            </StickerView>
          </View>
          <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(27,16,4,0.6)', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
            <Mono s={7.5} c={C.paper0} numberOfLines={1}>
              {portrait ? `Portrait: ${portrait.attr}` : `The room: ${places[0]?.name || ''}`}
            </Mono>
          </View>
        </View>

        {/* header */}
        <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                {portrait ? (
                  <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
                    <Photo source={{ uri: portrait.url }} style={{ width: '100%', height: '100%' }} />
                  </View>
                ) : (
                  <Monogram name={chef.name} size={60} fg={C.paper0} />
                )}
              </StickerView>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Banner s={8.5} tk={0.2} c={C.sun300}>
                  {multi ? 'The chef · several kitchens' : 'The chef'}
                </Banner>
                <Display s={22} c={C.paper0} style={{ lineHeight: 23, marginTop: 2 }}>
                  {chef.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 5 }} numberOfLines={2}>
                  {footprint}
                </Mono>
              </View>
            </View>
            {/* top award + acclaim */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
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
              {dossier.moments.map((m) => (
                <View key={m} style={{ borderWidth: 1.5, borderColor: C.paper0, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <Mono s={8} c={C.paper0}>
                    {m}
                  </Mono>
                </View>
              ))}
            </View>
            {/* the numbers */}
            <View style={{ flexDirection: 'row', marginTop: 14, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 12 }}>
              {stats.map(([n, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Display s={17} c={C.paper0} numberOfLines={1}>
                    {n}
                  </Display>
                  <Mono s={7.5} c={C.ink100}>
                    {l}
                  </Mono>
                </View>
              ))}
            </View>
          </StickerView>
        </View>

        {/* about — their Wikipedia introduction */}
        {bio ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }} accessibilityLabel="About the chef">
            <Head label="About" dot={C.stampBlue} />
            {description ? (
              <SerifDisplay s={16} c={C.inkDeep} style={{ lineHeight: 21, marginBottom: 6 }}>
                {description}
              </SerifDisplay>
            ) : null}
            <Serif s={13.5} c={C.inkMuted} style={{ lineHeight: 20 }} numberOfLines={more ? undefined : 5}>
              {bio.extract.slice((description || '').length).trim()}
            </Serif>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
              {bio.extract.length > 320 ? (
                <Pressable onPress={() => setMore((v) => !v)} hitSlop={6}>
                  <Mono s={9} c={C.ink400}>
                    {more ? 'Less' : 'Read more'}
                  </Mono>
                </Pressable>
              ) : null}
              <Pressable onPress={() => Linking.openURL(bio.pageUrl)} hitSlop={6} accessibilityLabel="Wikipedia article">
                <Mono s={9} c={C.inkSoft}>
                  Wikipedia ({bio.lang}) ↗
                </Mono>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* pictures: of them, then their dining rooms */}
        <View style={{ paddingTop: 22 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Head label="Pictures" right={`${pics.length + places.length}`} dot={C.sun500} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}>
            {pics.map((p) => (
              <Pressable key={p.url} onPress={() => p.pageUrl && Linking.openURL(p.pageUrl)} accessibilityLabel={`Photo of ${chef.name}`} style={{ width: 130, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
                <Photo source={{ uri: p.url }} style={{ width: '100%', height: 150 }} />
                <Mono s={7} c={C.inkMuted} numberOfLines={1} style={{ padding: 5 }}>
                  {p.attr}
                </Mono>
              </Pressable>
            ))}
            {places.map((p) => (
              <Pressable key={p.id} onPress={() => openPlace(p.id)} accessibilityLabel={`Their room: ${p.name}`} style={{ width: 170, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
                <VenueCover place={p} style={{ width: '100%', height: 150 }} crestSize={44} />
                <View style={{ padding: 6 }}>
                  <Banner s={7.5} tk={0.12} c={C.ink400}>
                    Their room
                  </Banner>
                  <Serif s={12} c={C.inkDeep} numberOfLines={1}>
                    {p.name}
                  </Serif>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* known for */}
        {dossier.dishes.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <Head label="Known for" right="from the guide" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {dossier.dishes.map((d) => (
                <Pressable key={d.dish + d.place.id} onPress={() => openPlace(d.place.id)} style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 6, paddingHorizontal: 10, maxWidth: '100%' }}>
                  <Serif s={12.5} c={C.inkDeep} numberOfLines={2}>
                    {d.dish.charAt(0).toUpperCase() + d.dish.slice(1)}
                  </Serif>
                  {multi ? (
                    <Mono s={7.5} c={C.ink400} numberOfLines={1}>
                      at {d.place.name}
                    </Mono>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* awards */}
        {dossier.awards.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <Head label="Awards & recognition" right={`${dossier.awards.length}`} dot={C.sun500} />
            <StickerView offset="sm" style={{ backgroundColor: C.sun100, borderWidth: 2, borderColor: C.inkBlack }}>
              {dossier.awards.map((a, i) => (
                <View key={a.text + a.place.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, paddingHorizontal: 11, borderTopWidth: i ? 1.5 : 0, borderColor: 'rgba(42,26,6,0.15)' }}>
                  <Display s={12} c={C.ink400}>
                    ★
                  </Display>
                  <View style={{ flex: 1 }}>
                    <Serif s={13} c={C.inkDeep} style={{ lineHeight: 17 }}>
                      {a.text}
                    </Serif>
                    {multi ? (
                      <Mono s={8} c={C.inkMuted}>
                        {a.place.name}
                      </Mono>
                    ) : null}
                  </View>
                </View>
              ))}
            </StickerView>
          </View>
        ) : null}

        {/* in the guide's words */}
        {dossier.words.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16, gap: 10 }}>
            <Head label="In the guide's words" />
            {dossier.words.map((w) => (
              <Pressable key={w.place.id} onPress={() => openPlace(w.place.id)} accessibilityLabel={`The guide on ${w.place.name}`} style={{ borderLeftWidth: 4, borderColor: C.ink400, backgroundColor: C.paper0, paddingVertical: 10, paddingHorizontal: 12 }}>
                <Banner s={8.5} tk={0.12} c={C.ink400}>
                  {w.place.name}
                  {guideBadgeOf(w.place) ? ` · ${guideBadgeOf(w.place)}` : ''}
                </Banner>
                <SerifItalic s={13.5} c={C.inkDeep} style={{ lineHeight: 19, marginTop: 4 }}>
                  “{w.text}”
                </SerifItalic>
                {w.why ? (
                  <Mono s={8.5} c={C.inkMuted} style={{ marginTop: 6, lineHeight: 13 }}>
                    Why now: {w.why}
                  </Mono>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* on camera */}
        {clips.length ? (
          <View style={{ paddingTop: 22 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <Head label="On camera" right={`${clips.length}`} dot={C.ink400} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}>
              {clips.map(({ c, p, featuring }) => (
                <Pressable key={c.id} onPress={() => openClips(p.id, c.id)} accessibilityLabel={`Watch: ${c.caption}`} style={{ width: 150, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
                  <View style={{ height: 96, backgroundColor: C.ink700 }}>
                    {c.thumb ? <Image source={{ uri: c.thumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(216,80,26,0.92)', borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
                        <PlayIcon size={12} color={C.paper0} />
                      </View>
                    </View>
                    {featuring ? (
                      <View style={{ position: 'absolute', top: 5, left: 5, backgroundColor: C.sun400, borderWidth: 1.5, borderColor: C.inkBlack, paddingHorizontal: 5 }}>
                        <Banner s={7} tk={0.08} c={C.inkDeep}>
                          Features them
                        </Banner>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ padding: 6, gap: 2 }}>
                    <Serif s={11} c={C.inkDeep} numberOfLines={2} style={{ lineHeight: 14 }}>
                      {c.caption}
                    </Serif>
                    <Mono s={7.5} c={C.inkMuted} numberOfLines={1}>
                      {c.creator} · {SOURCE_LABEL[c.platform]}
                    </Mono>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* what critics say about their kitchens */}
        {takes.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16, gap: 8 }}>
            <Head label="What critics say" right="SIM" />
            {takes.map(({ critic, take, p }) => (
              <StickerPressable key={critic.id + p.id} offset="sm" onPress={() => openCritic(critic.id)} accessibilityLabel={`Critic: ${critic.name}`} style={{ flexDirection: 'row', gap: 10, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 9 }}>
                <Monogram name={critic.name} size={32} rot="-4deg" />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Banner s={9.5} tk={0.04} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {critic.name}
                    </Banner>
                    <VerdictStamp v={take.verdict} small />
                  </View>
                  <SerifItalic s={12} c={C.inkMuted} numberOfLines={2} style={{ lineHeight: 16 }}>
                    {take.kind === 'clip' ? `“${take.quote}”` : take.quote}
                  </SerifItalic>
                  <Mono s={7.5} c={C.inkSoft}>
                    on {p.name}
                  </Mono>
                </View>
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <Display s={13} c={C.ink400}>
                    {take.score.toFixed(1)}
                  </Display>
                  <SimTag />
                </View>
              </StickerPressable>
            ))}
          </View>
        ) : null}

        {/* fans & supporters of their kitchens — each a profile to visit */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }} accessibilityLabel="Fans and supporters">
          <Head
            label="Fans & supporters"
            right={[backers.fans.length && `${backers.fans.length} ${backers.fans.length === 1 ? 'fan' : 'fans'}`, backers.supporters.length && `${backers.supporters.length} ${backers.supporters.length === 1 ? 'supporter' : 'supporters'}`].filter(Boolean).join(' · ') || 'none yet'}
            dot={C.stampPink}
          />
          {backers.fans.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {backers.fans.map((b) => (
                <FanChip key={b.fan.id} fan={b.fan} star={b.featured} line={backerLine(b, multi)} />
              ))}
            </View>
          ) : null}
          {backers.supporters.length ? (
            <>
              <Mono s={8.5} c={C.inkMuted} style={{ marginTop: backers.fans.length ? 12 : 0, marginBottom: 7 }}>
                Supporters — on their shortlist, just behind the crown
              </Mono>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {backers.supporters.map((b) => (
                  <FanChip key={b.fan.id} fan={b.fan} quiet line={backerLine(b, multi)} />
                ))}
              </View>
            </>
          ) : null}
          {!backers.fans.length && !backers.supporters.length ? (
            <Serif s={12.5} c={C.inkMuted} style={{ lineHeight: 18 }}>
              Nobody has crowned one of {chef.name.split(' ')[0]}’s kitchens their favourite yet.
            </Serif>
          ) : null}
        </View>

        {/* what they cook */}
        {chef.cuisines.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <Head label="What they cook" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[...chef.cuisines, ...dossier.occasions.map((o) => 'Ideal for ' + o.toLowerCase())].map((c) => (
                <View key={c} style={{ backgroundColor: C.sun100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={9} tk={0.03} c={C.inkDeep}>
                    {c}
                  </Banner>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* the restaurant group(s) this chef cooks within */}
        {chefGroups.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16, gap: 10 }}>
            <Head label="Part of" />
            {chefGroups.map((g) => (
              <StickerPressable key={g.id} offset="sm" onPress={() => openGroup(g.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sun100, borderWidth: 2, borderColor: C.inkBlack, padding: 11 }}>
                <Monogram name={g.crest} size={40} rot="-4deg" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Serif s={14} c={C.inkDeep} numberOfLines={1}>
                    {g.name}
                  </Serif>
                  <Mono s={8.5} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
                    {g.kind === 'named' ? 'Restaurant group' : 'Restaurant family'} · {g.placeIds.length} {g.placeIds.length === 1 ? 'restaurant' : 'restaurants'} · see group
                  </Mono>
                </View>
                <Display s={18} c={C.inkSoft}>
                  →
                </Display>
              </StickerPressable>
            ))}
          </View>
        ) : null}

        {/* their restaurants */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Head label={multi ? 'Their restaurants' : 'The restaurant'} right={`${places.length}`} />
          <View style={{ gap: 10 }}>
            {places.map((p) => (
              <VenueRow key={p.id} place={p} onOpen={() => openPlace(p.id)} />
            ))}
          </View>
        </View>

        {/* honest provenance */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <SerifItalic s={11.5} c={C.inkSoft} style={{ lineHeight: 17 }}>
            Restaurants, dishes and awards from the CRTQ CDMX guide{multi ? ', linked across the venues it credits to the same chef or team' : ''}. Portrait and biography from Wikipedia / Wikimedia Commons, credited. Critics' scores are CRTQ's simulated reading of their clips.
          </SerifItalic>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
