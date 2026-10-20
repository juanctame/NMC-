/**
 * Critic profile — a real creator or food outlet, connected from the clips they
 * published about the guide's restaurants (data/critics.ts).
 *
 * It's a simulated profile and says so up front: their words are quoted exactly
 * as posted (clip titles) or paraphrased from press reports with the source;
 * the verdict, the 0–10 score and the palate are CRTQ's reading of that content,
 * never ratings they gave. Connected accounts are only ones with evidence — the
 * accounts their clips came from, or a link their own site lists.
 */
import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { useT } from '../i18n';
import { criticById, type Take, type Account } from '../data/critics';
import { computePalate, tasteMatch, PALATE_AXES } from '../data/palate';
import { SOURCE_LABEL } from '../data/videos';
import { guideBadgeOf } from '../data/chefs';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Monogram } from '../components/Monogram';
import { PalateRadar } from '../components/PalateRadar';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';
import { PlayIcon } from '../components/icons';
import { SimTag, VerdictStamp, VERDICT_COLOR } from '../components/CriticMarks';
import { houseCriticById } from '../data/houseCritics';
import { HouseCriticProfile } from './HouseCriticProfile';
import { CriticPassportScreen, ProfileSwitch, issuedOn, type CriticPassportSubject } from './CriticPassport';

const ACCOUNT_LABEL: Record<string, string> = { ...SOURCE_LABEL, web: 'Website' };

function TakeCard({ take }: { take: Take }) {
  const openPlace = useStore((s) => s.openPlace);
  const openClips = useStore((s) => s.openClips);
  const nearbyById = useStore((s) => s.nearbyById);
  const place = resolvePlace(take.placeId, nearbyById);
  if (!place) return null;
  const badge = guideBadgeOf(place);
  const src = take.kind === 'reported' ? `Reported by ${take.outlet}` : take.clip ? SOURCE_LABEL[take.clip.platform] : '';
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack }}>
      <Pressable onPress={() => openPlace(place.id)} accessibilityLabel={`Take on ${place.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1.5, borderColor: C.ink100 }}>
        <Monogram name={place.name} size={36} rot="-4deg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Serif s={14} c={C.inkDeep} numberOfLines={1}>
            {place.name}
          </Serif>
          <Mono s={8} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
            {[place.hood, badge, place.price].filter(Boolean).join(' · ')}
          </Mono>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: VERDICT_COLOR[take.verdict].bg, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={14} c={VERDICT_COLOR[take.verdict].fg}>
              {take.score.toFixed(1)}
            </Display>
          </View>
          <SimTag />
        </View>
      </Pressable>
      <View style={{ padding: 10, gap: 7 }}>
        <VerdictStamp v={take.verdict} small />
        <SerifItalic s={13} c={C.inkDeep} style={{ lineHeight: 18 }} numberOfLines={4}>
          {take.kind === 'clip' ? `“${take.quote}”` : take.quote}
        </SerifItalic>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Mono s={8} c={C.inkSoft} numberOfLines={1} style={{ flexShrink: 1 }}>
            {[src, take.date ? take.date.slice(0, 10) : '', take.more ? `+${take.more} more ${take.more === 1 ? 'clip' : 'clips'}` : ''].filter(Boolean).join(' · ')}
          </Mono>
          <View style={{ flex: 1 }} />
          {take.clip ? (
            <Pressable
              onPress={() => openClips(place.id, take.clip!.id)}
              accessibilityLabel={`Watch their clip about ${place.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
            >
              <PlayIcon size={9} color={C.paper0} />
              <Banner s={8.5} tk={0.08} c={C.paper0}>
                Watch
              </Banner>
            </Pressable>
          ) : null}
          {take.kind === 'reported' ? (
            <Pressable onPress={() => Linking.openURL(take.sourceUrl)} accessibilityLabel={`Source: ${take.outlet}`} style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
              <Banner s={8.5} tk={0.08} c={C.inkDeep}>
                Source ↗
              </Banner>
            </Pressable>
          ) : null}
        </View>
      </View>
    </StickerView>
  );
}

function AccountRow({ a }: { a: Account }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(a.url)}
      accessibilityLabel={`${ACCOUNT_LABEL[a.platform] || a.platform}: ${a.label}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 11, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack }}
    >
      <View style={{ minWidth: 76, backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, alignItems: 'center' }}>
        <Banner s={8} tk={0.08} c={C.paper0} numberOfLines={1}>
          {ACCOUNT_LABEL[a.platform] || a.platform}
        </Banner>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Mono s={10.5} c={C.inkDeep} numberOfLines={1}>
          {a.label}
        </Mono>
        <Mono s={7.5} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 1 }}>
          ✓ {a.evidence}
        </Mono>
      </View>
      <Display s={14} c={C.inkSoft}>
        ↗
      </Display>
    </Pressable>
  );
}

export function CriticProfile() {
  const insets = useSafeAreaInsets();
  const id = useStore((s) => s.activeCriticId);
  const close = useStore((s) => s.closeCritic);
  const follows = useStore((s) => s.follows);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const t = useT();
  const nearbyById = useStore((s) => s.nearbyById);
  const [mode, setMode] = React.useState<'profile' | 'passport'>('profile');
  React.useEffect(() => setMode('profile'), [id]);

  const house = houseCriticById(id);
  if (house) return <HouseCriticProfile c={house} />;
  const critic = criticById(id);
  if (!critic) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;
  const following = !!follows['critic:' + critic.id];
  const mine = computePalate(ranked, tastes, userReviews);
  const match = tasteMatch(mine, critic.palate);
  const axisLabels = PALATE_AXES.map((k) => t('axis.' + k));

  if (mode === 'passport') {
    const places = critic.takes.map((tk) => resolvePlace(tk.placeId, nearbyById) && { ...resolvePlace(tk.placeId, nearbyById)!, score: tk.score }).filter((p): p is NonNullable<typeof p> => !!p);
    const dates = critic.takes.map((tk) => tk.date).filter(Boolean).sort() as string[];
    const passport: CriticPassportSubject = {
      id: critic.id,
      name: critic.name,
      handle: critic.handle,
      house: false,
      beat: [critic.kind === 'outlet' ? 'Food media' : 'Creator', critic.hoods[0]].filter(Boolean).join(' · '),
      signature: critic.bio || critic.summary,
      places,
      avg: critic.avg,
      joined: issuedOn(dates[0]) || 'CRTQ',
    };
    return <CriticPassportScreen s={passport} onBack={close} onProfile={() => setMode('profile')} top={insets.top} bottom={insets.bottom} />;
  }

  const stats: [string, string][] = [
    [String(critic.takes.length), critic.takes.length === 1 ? 'restaurant' : 'restaurants'],
    [String(critic.clipCount), critic.clipCount === 1 ? 'clip' : 'clips'],
    [critic.avg.toFixed(1), 'sim. avg'],
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
            <Banner s={10} tk={0.16} c={C.inkMuted} numberOfLines={1} style={{ flex: 1 }}>
              {critic.kind === 'outlet' ? 'Food media' : 'Creator'} · critic profile
            </Banner>
            <ProfileSwitch mode="profile" onChange={setMode} />
          </View>

          {/* header */}
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            <View style={{ position: 'absolute', top: 12, right: 12, transform: [{ rotate: '6deg' }], backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Banner s={8} tk={0.14} c={C.inkDeep}>
                Simulated
              </Banner>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Monogram name={critic.name} size={60} fg={C.paper0} />
              </StickerView>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 54 }}>
                <Display s={21} c={C.paper0} style={{ lineHeight: 23 }} numberOfLines={2}>
                  {critic.name}
                </Display>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }} numberOfLines={1}>
                  {[critic.handle, critic.platforms.map((p) => SOURCE_LABEL[p]).join(' · '), critic.lang?.toUpperCase()].filter(Boolean).join(' · ')}
                </Mono>
              </View>
            </View>
            {critic.bio ? (
              <Serif s={12.5} c={C.paper0} style={{ marginTop: 12, lineHeight: 18 }}>
                {critic.bio}
              </Serif>
            ) : null}
            <SerifItalic s={12} c={C.sun200} style={{ marginTop: critic.bio ? 6 : 12, lineHeight: 17 }}>
              {critic.summary}
            </SerifItalic>
            <View style={{ flexDirection: 'row', marginTop: 14, borderTopWidth: 2, borderColor: C.paper0, paddingTop: 12 }}>
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
                onPress={() => toggleFollow('critic:' + critic.id)}
                accessibilityLabel={following ? `Following ${critic.name}` : `Follow ${critic.name}`}
                style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.sun400, paddingVertical: 10 }}
              >
                <Banner s={10} tk={0.1} c={following ? C.paper0 : C.inkDeep}>
                  {following ? 'Following on CRTQ' : 'Follow on CRTQ'}
                </Banner>
              </StickerPressable>
            </View>
          </StickerView>
        </View>

        {/* what "simulated" means */}
        <View style={{ marginTop: 14, marginHorizontal: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.inkSoft, padding: 11, gap: 4 }}>
          <Banner s={8.5} tk={0.14} c={C.inkDeep}>
            How this profile is made
          </Banner>
          <Serif s={11.5} c={C.inkMuted} style={{ lineHeight: 16 }}>
            Built by CRTQ from {critic.name}’s public {critic.clipCount === 1 ? 'clip' : 'clips'}. Quotes are their own titles, as posted; reported takes link the article.
            Verdicts, scores (<Mono s={9} c={C.inkMuted}>SIM</Mono>) and the palate are CRTQ’s reading of that content — not ratings they gave. Not affiliated with or endorsed by{' '}
            {critic.name}.
          </Serif>
        </View>

        {/* connected social media */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampBlue }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              Connected accounts
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            <Mono s={9} c={C.inkSoft}>
              {critic.accounts.length}
            </Mono>
          </View>
          {critic.accounts.map((a) => (
            <AccountRow key={a.url} a={a} />
          ))}
        </View>

        {/* simulated palate */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sun500 }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              Their palate
            </Banner>
            <SimTag />
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
          </View>
          <StickerView offset="sm" style={{ backgroundColor: C.sun100, borderWidth: 2, borderColor: C.inkBlack, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PalateRadar axes={critic.palate.axes} labels={axisLabels} size={118} showLabels={false} fill={C.ink400} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Display s={16} c={C.inkDeep} style={{ lineHeight: 18 }}>
                {t('arch.' + critic.palate.archId + '.t')}
              </Display>
              <Mono s={8.5} c={C.inkMuted} numberOfLines={2}>
                {critic.palate.topCuisines
                  .map((c) => c.name)
                  .slice(0, 3)
                  .join(' · ') || 'Mexico City'}
              </Mono>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={{ backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <Banner s={9} tk={0.06} c={C.sun300}>
                    {match}% match
                  </Banner>
                </View>
                <Mono s={8} c={C.inkSoft}>
                  with your palate
                </Mono>
              </View>
            </View>
          </StickerView>
        </View>

        {/* their takes */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              Their takes
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            <Mono s={9} c={C.inkSoft}>
              {critic.takes.length}
            </Mono>
          </View>
          <View style={{ gap: 12 }}>
            {critic.takes.map((tk) => (
              <TakeCard key={tk.placeId} take={tk} />
            ))}
          </View>
        </View>

        {critic.bioSource ? (
          <Pressable onPress={() => Linking.openURL(critic.bioSource!)} style={{ paddingTop: 16, paddingHorizontal: 16 }}>
            <Mono s={8.5} c={C.inkSoft}>
              About: {critic.bioSource.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]} ↗
            </Mono>
          </Pressable>
        ) : null}
      </ScrollView>
    </ScreenIn>
  );
}
