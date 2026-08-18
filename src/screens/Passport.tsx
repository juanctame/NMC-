/**
 * Passport (You) — the profile rendered as a vintage travel document. Regular
 * diners get a NOMAD passport (stamps, cuisine standings, taste tags). Verified
 * CRITICS get a distinct CRITIC'S PASS: a press-seal header, critic stats
 * (verdicts, events hosted, followers), and a Critic's Desk that lets them host
 * curated events at restaurants — something regular users can't do.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { scoreStyle, fmt } from '../store/helpers';
import { C, col } from '../theme/tokens';
import { identity, isCritic, formatFollowers, CRITIC_BEATS } from '../data/profile';
import { cityById } from '../data/cities';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { LangPicker } from '../components/LangPicker';
import { Roundel } from '../components/Roundel';
import { Grain } from '../components/Grain';
import { PlusIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

const CUISINE_TOP: [string, number][] = [
  ['Mexican', 24],
  ['Seafood', 15],
  ['Bakery', 11],
  ['Contemporary', 8],
];
const CMAX = 24;
const TASTE_TAGS = ['Mexican', 'Seafood', 'Bakery', 'Street Food', 'Bar'];

function StatCell({ value, label, last }: { value: string | number; label: string; last?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRightWidth: last ? 0 : 2, borderColor: C.paper0 }}>
      <Display s={21} c={C.sun400}>
        {value}
      </Display>
      <Banner s={7.5} tk={0.14} c={C.ink100}>
        {label}
      </Banner>
    </View>
  );
}

/** Small vermillion verified seal used next to a critic's name. */
function CriticSeal() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
      <Banner s={9} c={C.paper0}>
        ✓
      </Banner>
      <Banner s={8} tk={0.12} c={C.paper0}>
        CRITIC
      </Banner>
    </View>
  );
}

function BecomeCriticCard({ onVerify }: { onVerify: (beat: string) => void }) {
  const [beat, setBeat] = useState(CRITIC_BEATS[0]);
  return (
    <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 15, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
          <Banner s={13} c={C.paper0}>
            ✓
          </Banner>
        </View>
        <View style={{ flex: 1 }}>
          <Banner s={13} tk={0.04} c={C.inkDeep}>
            Become a verified Critic
          </Banner>
          <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
            A verified profile · host events at restaurants
          </Mono>
        </View>
      </View>
      <Serif s={12.5} c={C.inkMuted} style={{ lineHeight: 18 }}>
        Critics carry a press seal, their verdicts stand out, and they can put curated events on the community calendar.
      </Serif>
      <Mono s={9} c={C.inkSoft}>
        YOUR BEAT
      </Mono>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {CRITIC_BEATS.map((b) => {
          const on = beat === b;
          return (
            <Pressable key={b} onPress={() => setBeat(b)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11, backgroundColor: on ? C.sun400 : C.paper0 }}>
              <Banner s={9.5} tk={0.06} c={C.inkDeep}>
                {b}
              </Banner>
            </Pressable>
          );
        })}
      </View>
      <StickerPressable offset="sm" radius={999} onPress={() => onVerify(beat)} style={{ marginTop: 4, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 13 }}>
        <Banner s={12.5} tk={0.1} c={C.paper0}>
          Get verified as a Critic
        </Banner>
      </StickerPressable>
      <Mono s={8.5} c={C.inkSoft} style={{ textAlign: 'center' }}>
        Pilot: instant for testers · real verification lands with the backend
      </Mono>
    </StickerView>
  );
}

export function Passport() {
  const insets = useSafeAreaInsets();
  const ranked = useStore((s) => s.ranked);
  const profile = useStore((s) => s.profile);
  const signOut = useStore((s) => s.signOut);
  const becomeCritic = useStore((s) => s.becomeCritic);
  const stepDownCritic = useStore((s) => s.stepDownCritic);
  const openCreate = useStore((s) => s.openCreate);
  const go = useStore((s) => s.go);
  const createdTables = useStore((s) => s.createdTables);
  const t = useT();

  const me = identity(profile);
  const critic = isCritic(profile);
  const homeCity = cityById(me.cityId);
  const beenTotal = ranked.length;

  const scores = ranked.map((r) => r.score!);
  const avg = scores.length ? fmt(scores.reduce((a, b) => a + b, 0) / scores.length) : '0.0';
  const cuisineCount: Record<string, number> = {};
  ranked.forEach((r) => {
    cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
  });
  const cuisines = Object.keys(cuisineCount).length + 4;
  const eventsHosted = createdTables.filter((t: any) => t.critic).length;
  const recentStamps = ranked.slice(0, 6);

  const hostEvent = () => {
    go('table');
    openCreate('event');
  };

  return (
    <ScreenIn>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* pass card */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, padding: 18, overflow: 'hidden' }}>
            <Grain opacity={0.08} />
            {critic ? (
              <View style={{ position: 'absolute', top: 12, right: -30, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 3, paddingHorizontal: 34, transform: [{ rotate: '38deg' }] }}>
                <Banner s={8.5} tk={0.16} c={C.paper0}>
                  PRESS
                </Banner>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-4deg' }] }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: col(me.color), borderWidth: 2.5, borderColor: critic ? C.sun400 : C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  <Banner s={18} c={C.paper0}>
                    {me.initials}
                  </Banner>
                </View>
              </StickerView>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Display s={22} c={C.paper0} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {me.name}
                  </Display>
                  {critic ? <CriticSeal /> : null}
                </View>
                <Mono s={9.5} c={C.sun300} style={{ marginTop: 4 }}>
                  {critic ? "CRITIC'S PASS" : 'PASSPORT'} Nº {me.passportNo.toLocaleString()} · EST. {me.joined}
                </Mono>
                <Mono s={9.5} c={C.ink100} style={{ marginTop: 2 }}>
                  {critic ? `Verified Critic · ${me.beat || 'CDMX dining'}` : `${homeCity.name} · Nomad`}
                </Mono>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16, borderWidth: 2, borderColor: C.paper0 }}>
              {critic ? (
                <>
                  <StatCell value={beenTotal} label={t('stat.verdicts')} />
                  <StatCell value={eventsHosted} label={t('stat.events')} />
                  <StatCell value={formatFollowers(me.followers || 0)} label={t('stat.followers')} />
                  <StatCell value={avg} label={t('stat.avg')} last />
                </>
              ) : (
                <>
                  <StatCell value={beenTotal} label={t('stat.ranked')} />
                  <StatCell value={41} label={t('stat.thisYear')} />
                  <StatCell value={cuisines} label={t('stat.cuisines')} />
                  <StatCell value={avg} label={t('stat.avg')} last />
                </>
              )}
            </View>
          </StickerView>
        </View>

        {/* critic's desk — only verified critics can host events */}
        {critic ? (
          <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                Critic’s desk
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            </View>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 15, gap: 11 }}>
              <Serif s={13.5} c={C.inkDeep} style={{ lineHeight: 19 }}>
                You’re verified on the <Serif s={13.5} c={C.ink400}>{me.beat || 'CDMX dining'}</Serif> beat. Host curated events at any restaurant — they publish to the community calendar with your critic seal.
              </Serif>
              <StickerPressable offset="sm" radius={999} onPress={hostEvent} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink700, paddingVertical: 13 }}>
                <PlusIcon size={15} color={C.sun400} sw={2.6} />
                <Banner s={12} tk={0.1} c={C.paper0}>
                  Host an event
                </Banner>
              </StickerPressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Mono s={9.5} c={C.inkSoft}>
                  {eventsHosted === 0 ? 'No events yet — host your first.' : `${eventsHosted} event${eventsHosted > 1 ? 's' : ''} hosted · your reviews now carry a Critic seal`}
                </Mono>
              </View>
            </StickerView>
          </View>
        ) : null}

        {/* recent stamps */}
        <View style={{ paddingTop: 20, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            {critic ? t('you.verdicts') : t('you.stamps')}
          </Banner>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {recentStamps.map((r, i) => {
              const ss = scoreStyle(r.score!);
              return (
                <View key={r.id} style={{ width: 76, alignItems: 'center', gap: 5 }}>
                  <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: i % 2 ? '4deg' : '-5deg' }] }}>
                    <Roundel size={72} bg={ss.bg} fg={ss.fg} text={fmt(r.score!)} textSize={22} dashInset={6} />
                  </StickerView>
                  <Mono s={8.5} c={C.inkMuted} numberOfLines={1} style={{ textAlign: 'center' }}>
                    {r.name}
                  </Mono>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* cuisine standings */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            {t('you.rankCuisines')}
          </Banner>
          <View style={{ gap: 9 }}>
            {CUISINE_TOP.map(([name, count]) => (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Banner s={10} tk={0.06} c={C.inkDeep} style={{ width: 76 }}>
                  {name}
                </Banner>
                <View style={{ flex: 1, height: 14, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper100 }}>
                  <View style={{ height: '100%', width: `${Math.round((count / CMAX) * 100)}%`, backgroundColor: C.sun400 }} />
                </View>
                <Mono s={10} c={C.inkMuted} style={{ width: 30, textAlign: 'right' }}>
                  {count}
                </Mono>
              </View>
            ))}
          </View>
        </View>

        {/* taste tags */}
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            {t('you.chase')}
          </Banner>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TASTE_TAGS.map((name) => (
              <StickerView key={name} offset="sm" radius={999} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Banner s={10} tk={0.1} c={C.inkDeep}>
                  {name}
                </Banner>
              </StickerView>
            ))}
          </View>
        </View>

        {/* become a critic — signed-in nomads only */}
        {profile && !critic ? (
          <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
            <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
              {t('you.criticAccess')}
            </Banner>
            <BecomeCriticCard onVerify={becomeCritic} />
          </View>
        ) : null}

        {/* language */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 12 }}>
            {t('you.language')}
          </Banner>
          <LangPicker showLabels size={44} />
        </View>

        {/* account */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16, paddingBottom: 34 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted} style={{ marginBottom: 10 }}>
            {t('you.account')}
          </Banner>
          <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Banner s={11} tk={0.06} c={C.inkDeep}>
                {me.handle}
              </Banner>
              <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
                {critic ? 'Verified Critic · this device' : profile ? 'Local account · this device' : 'Guest · demo identity'}
              </Mono>
            </View>
            {critic ? (
              <StickerPressable offset="sm" radius={999} onPress={stepDownCritic} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13, marginRight: 8 }}>
                <Banner s={9.5} tk={0.1} c={C.inkMuted}>
                  Step down
                </Banner>
              </StickerPressable>
            ) : null}
            <StickerPressable offset="sm" radius={999} onPress={signOut} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 7, paddingHorizontal: 13 }}>
              <Banner s={9.5} tk={0.1} c={C.ink400}>
                {profile ? t('you.signout') : t('you.create')}
              </Banner>
            </StickerPressable>
          </View>
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
