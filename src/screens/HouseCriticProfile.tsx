/**
 * House critic profile — a real person whose scores are their own
 * (data/houseCritics.ts). Unlike the simulated creator profiles, nothing here is
 * CRTQ's reading: the list is theirs, copied from the app they rank in (Beli),
 * and read live from their CRTQ passport when they keep one under the same
 * handle. If the viewer *is* that critic, their own ranked list shows here and
 * they can bring their Beli list in from screenshots.
 */
import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { beenOf, fetchLiveList, placeOf, type HouseCritic, type HouseEntry } from '../data/houseCritics';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';

const norm = (h?: string | null) => (h || '').trim().toLowerCase().replace(/^@/, '');

function scoreColor(s: number): string {
  if (s >= 8.5) return C.stampGreen;
  if (s >= 7) return C.sun400;
  return C.ink200;
}

function EntryRow({ e, rank }: { e: HouseEntry; rank: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const nearbyById = useStore((s) => s.nearbyById);
  const place = placeOf(e) || resolvePlace(e.placeId || null, nearbyById);
  const hood = e.hood || place?.hood;
  const body = (
    <>
      <Mono s={10} c={C.inkSoft} style={{ width: 22, textAlign: 'right' }}>
        {rank}
      </Mono>
      <Monogram name={place?.name || e.name} size={34} rot={rank % 2 ? '-4deg' : '3deg'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Serif s={14} c={C.inkDeep} numberOfLines={1}>
          {place?.name || e.name}
        </Serif>
        <Mono s={8} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
          {[hood, place?.price, e.note].filter(Boolean).join(' · ') || 'Mexico City'}
        </Mono>
      </View>
      {e.score != null ? (
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: scoreColor(e.score), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Display s={13} c={e.score >= 8.5 ? C.paper0 : C.inkDeep}>
            {e.score.toFixed(1)}
          </Display>
        </View>
      ) : null}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack };
  return place ? (
    <Pressable onPress={() => openPlace(place.id)} accessibilityLabel={`${place.name}, ${e.score != null ? e.score.toFixed(1) : 'unscored'}`} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

function Section({ title, n, dot }: { title: string; n?: number; dot: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {title}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {n != null ? (
        <Mono s={9} c={C.inkSoft}>
          {n}
        </Mono>
      ) : null}
    </View>
  );
}

export function HouseCriticProfile({ c }: { c: HouseCritic }) {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeCritic);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const openImport = useStore((s) => s.openImport);
  const profile = useStore((s) => s.profile);
  const ranked = useStore((s) => s.ranked);
  const wantIds = useStore((s) => s.wantIds);
  const nearbyById = useStore((s) => s.nearbyById);
  const [live, setLive] = React.useState<HouseEntry[] | null>(null);
  const [photoOk, setPhotoOk] = React.useState(!!c.photo);

  React.useEffect(() => {
    let on = true;
    fetchLiveList(c).then((l) => on && l && l.length && setLive(l));
    return () => {
      on = false;
    };
  }, [c.id]);

  const isMe = !!profile && norm(profile.handle) === norm(c.handle);
  // Their own device: their ranked list is the freshest copy there is.
  const mine: HouseEntry[] | null = isMe
    ? [
        ...ranked.map((p) => ({ placeId: p.id, name: p.name, hood: p.hood, score: p.score, list: 'been' as const })),
        ...wantIds.map((id) => resolvePlace(id, nearbyById)).flatMap((p) => (p ? [{ placeId: p.id, name: p.name, hood: p.hood, list: 'want' as const }] : [])),
      ]
    : null;
  const list = (mine && mine.length ? mine : live) || c.list;
  const from = mine && mine.length ? 'your passport' : live ? 'their CRTQ passport, live' : c.asOf ? `${c.source}, ${c.asOf}` : c.source;
  const been = beenOf(c, list);
  const wants = list.filter((e) => e.list === 'want');
  const avg = been.length ? been.reduce((a, e) => a + (e.score || 0), 0) / been.length : null;
  const following = !!follows['critic:' + c.id];
  const beli = c.links.find((l) => l.platform === 'Beli');

  const stats: [string, string][] = [
    [String(been.length), been.length === 1 ? 'place ranked' : 'places ranked'],
    [avg != null ? avg.toFixed(1) : '—', 'avg score'],
    [String(wants.length), 'want to try'],
  ];

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <Pressable onPress={close} accessibilityLabel="Back" style={{ paddingRight: 4, paddingVertical: 4 }}>
              <Display s={20} c={C.ink400}>
                ←
              </Display>
            </Pressable>
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              CRTQ critic · real scores
            </Banner>
          </View>

          <StickerView offset="lg" style={{ backgroundColor: C.inkDeep, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ position: 'absolute', top: 12, right: 12, transform: [{ rotate: '6deg' }], backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={8} tk={0.14} c={C.paper0}>
                House critic
              </Banner>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                {photoOk && c.photo ? (
                  <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
                    <Image source={{ uri: c.photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setPhotoOk(false)} accessibilityLabel={c.name} />
                  </View>
                ) : (
                  <Monogram name={c.name} size={64} fg={C.paper0} />
                )}
              </StickerView>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 60 }}>
                <Display s={21} c={C.paper0} style={{ lineHeight: 23 }} numberOfLines={2}>
                  {c.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }} numberOfLines={1}>
                  {[c.handle, c.source, 'CDMX'].join(' · ')}
                </Mono>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 12 }}>
              {stats.map(([n, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Display s={20} c={C.paper0}>
                    {n}
                  </Display>
                  <Mono s={8} c={C.ink100}>
                    {l}
                  </Mono>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => toggleFollow('critic:' + c.id)}
                accessibilityLabel={following ? `Following ${c.name}` : `Follow ${c.name}`}
                style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.sun400, paddingVertical: 10 }}
              >
                <Banner s={10} tk={0.1} c={following ? C.paper0 : C.inkDeep}>
                  {following ? 'Following' : 'Follow'}
                </Banner>
              </StickerPressable>
              {beli ? (
                <Pressable
                  onPress={() => Linking.openURL(beli.url)}
                  accessibilityLabel={`${c.name} on Beli`}
                  style={{ alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.paper0, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}
                >
                  <Banner s={10} tk={0.1} c={C.paper0}>
                    Beli ↗
                  </Banner>
                </Pressable>
              ) : null}
            </View>
          </StickerView>
        </View>

        <View style={{ marginTop: 14, marginHorizontal: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft, padding: 11, gap: 4 }}>
          <Banner s={8.5} tk={0.14} c={C.inkDeep}>
            How this profile is made
          </Banner>
          <Serif s={11.5} c={C.inkMuted} style={{ lineHeight: 16 }}>
            Every score here is {c.name}’s own, from his {c.source} list — nothing is estimated by CRTQ. When he ranks on CRTQ as {c.handle}, this page follows his passport
            live.
          </Serif>
        </View>

        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Section title="His list" n={been.length} dot={C.stampGreen} />
          {been.length ? (
            <>
              <Mono s={8.5} c={C.inkSoft} style={{ marginBottom: 8 }}>
                From {from}
              </Mono>
              <View style={{ gap: 8 }}>
                {been.map((e, i) => (
                  <EntryRow key={(e.placeId || e.name) + i} e={e} rank={i + 1} />
                ))}
              </View>
            </>
          ) : (
            <StickerView offset="sm" style={{ backgroundColor: C.sun100, borderWidth: 2, borderColor: C.inkBlack, padding: 14, gap: 8 }}>
              <Display s={16} c={C.inkDeep}>
                His {c.source} list is on its way
              </Display>
              <Serif s={12} c={C.inkMuted} style={{ lineHeight: 17 }}>
                {c.source} keeps lists inside its app, so they can’t be read from the web. It lands here as soon as it’s brought in from his {c.source} screenshots — or when he
                imports it into his CRTQ passport.
              </Serif>
              {isMe ? (
                <StickerPressable
                  offset="sm"
                  radius={999}
                  onPress={() => openImport('beli')}
                  accessibilityLabel="Import my Beli list"
                  style={{ alignSelf: 'flex-start', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.inkDeep, paddingVertical: 9, paddingHorizontal: 16 }}
                >
                  <Banner s={10} tk={0.1} c={C.paper0}>
                    Import my Beli list →
                  </Banner>
                </StickerPressable>
              ) : null}
            </StickerView>
          )}
        </View>

        {wants.length ? (
          <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <Section title="Wants to try" n={wants.length} dot={C.sun500} />
            <View style={{ gap: 8 }}>
              {wants.map((e, i) => (
                <EntryRow key={(e.placeId || e.name) + 'w' + i} e={e} rank={i + 1} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenIn>
  );
}
