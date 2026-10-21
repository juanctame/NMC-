/**
 * Feed (home) — social home: trending strip, friends' activity, personalized
 * recs, and (once unlocked) the Dine Club teaser.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace } from '../store/useStore';
import { useT } from '../i18n';
import { FEED, byId, type Place } from '../store/data';
import { FEATURED_CRITICS, criticForClip, type Critic } from '../data/critics';
import { HOUSE_CRITICS } from '../data/houseCritics';
import { HouseCriticCard } from '../components/HouseCriticCard';
import { VerdictStamp, SimTag, VERDICT_COLOR } from '../components/CriticMarks';
import { embedUrlFor, SOURCE_LABEL } from '../data/videos';
import type { BuzzResult } from '../data/trending';
import { computePalate } from '../data/palate';
import { recommend, type Rec, type ReasonTag } from '../data/recommend';
import { categoryOf, FAV_CATS, type FavCat } from '../data/favorites';
import { CARTE_RISING } from '../data/carte';
import { FEATURED_CHEFS, type Chef } from '../data/chefs';
import { GROUPS, type Group } from '../data/groups';
import { staticCover } from '../data/media';
import { buildClipFeed, type FeedClip } from '../data/clipFeed';

const PLATFORM_TAG: Record<string, string> = { tiktok: 'TT', instagram: 'IG', youtube: 'YT' };
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { col } from '../theme/tokens';
import { photo, BRAND } from '../assets';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { Monogram } from '../components/Monogram';
import { PlaceCover, VenueCover } from '../components/Cover';
import { FreshFinds } from '../components/FreshFinds';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { CacheChip } from '../components/CacheChip';
import { Grain } from '../components/Grain';
import { ScreenIn } from '../components/Anim';
import { GlobeMark, MapIcon, ChartIcon, PlayIcon, HeartIcon, CommentIcon, BookmarkIcon } from '../components/icons';

function HeaderIconButton({ onPress, label, children }: { onPress: () => void; label?: string; children: React.ReactNode }) {
  return (
    <StickerView offset="sm" radius={999}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: C.paper0,
          borderWidth: 2,
          borderColor: C.inkBlack,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Pressable>
    </StickerView>
  );
}

/** Compact count: 1234 → "1.2k", 2_400_000 → "2.4M". */
function compact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.0', '') + 'k';
  return String(n);
}

/**
 * A "most mentioned this month" card: the hero creator clip (tap to play),
 * rank + buzz stats, the venue, and — when the creator is one of our
 * tastemakers — an "On CRTQ" link into their in-app presence.
 */
function MonthlyTrendCard({ item, rank }: { item: BuzzResult; rank: number }) {
  const openReel = useStore((s) => s.openReel);
  const openPlace = useStore((s) => s.openPlace);
  const t = useT();
  const url = embedUrlFor(item.video);
  const openCritic = useStore((s) => s.openCritic);
  const heroCritic = criticForClip(item.video);
  return (
    <View style={{ width: 168, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      {/* hero clip */}
      <Pressable
        onPress={() => url && openReel(rank - 1)}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.name}`}
        style={{ width: '100%', height: 110, backgroundColor: C.ink700 }}
      >
        {item.video.thumb ? (
          <Image source={{ uri: item.video.thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
        <View style={{ position: 'absolute', top: 6, left: 6, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Display s={10} c={C.inkDeep}>
            {rank}
          </Display>
        </View>
        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: C.inkBlack, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
          <Banner s={7} tk={0.06} c={C.paper0}>
            {(item.video as { hd?: boolean }).hd ? 'HD · ' : ''}{SOURCE_LABEL[item.video.platform] || item.video.platform}
          </Banner>
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(216,80,26,0.92)', borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
            <PlayIcon size={13} color={C.paper0} />
          </View>
        </View>
      </Pressable>
      {/* meta */}
      <View style={{ padding: 9, gap: 4 }}>
        <Pressable onPress={() => openPlace(item.placeId)}>
          <SerifDisplay s={15} c={C.inkDeep} numberOfLines={1}>
            {item.name}
          </SerifDisplay>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink400 }} />
          <Mono s={8.5} c={C.inkMuted} numberOfLines={1}>
            {item.mentions} {t('feed.clips')} · {compact(item.totalViews)} {t('feed.views')}
          </Mono>
        </View>
        <Mono s={8.5} c={C.inkSoft} numberOfLines={1}>
          {t('feed.via')} {item.creator.name}
        </Mono>
        {heroCritic ? (
          <Pressable
            onPress={() => openCritic(heroCritic.id)}
            accessibilityLabel={`Critic profile: ${heroCritic.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 1, backgroundColor: C.sun400, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}
          >
            <Banner s={7.5} tk={0.06} c={C.inkDeep}>
              ✦ {t('feed.onCrtq')}
            </Banner>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * A vertical (9:16) clip preview — the creator's thumbnail, reach, @creator and
 * the restaurant it's pinned to. Opens the full-screen Clips feed at this clip.
 */
function ClipPreview({ item }: { item: FeedClip }) {
  const openClips = useStore((s) => s.openClips);
  const { clip, place } = item;
  return (
    <Pressable
      onPress={() => openClips(null, clip.id)}
      accessibilityRole="button"
      accessibilityLabel={`Clip about ${place.name} by ${clip.creator}`}
      style={{ width: 118, height: 210, backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}
    >
      {clip.thumb ? <Image source={{ uri: clip.thumb }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, backgroundColor: 'rgba(15,9,2,0.55)' }} />
      <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(27,16,4,0.7)', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 6 }}>
        <PlayIcon size={8} color={C.paper0} />
        <Mono s={8} c={C.paper0}>
          {clip.views ? compact(clip.views) : 'Play'}
        </Mono>
      </View>
      {clip.hd ? (
        <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: C.inkBlack, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 4 }}>
          <Banner s={6.5} tk={0.06} c={C.paper0}>
            HD
          </Banner>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 7, right: 7, bottom: 7, gap: 5 }}>
        <Mono s={8} c={C.ink100} numberOfLines={1}>
          @{clip.creator}
        </Mono>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: C.paper0, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingLeft: 2, paddingRight: 7 }}>
          <Monogram name={place.name} size={16} />
          <Banner s={7.5} tk={0.04} c={C.inkDeep} numberOfLines={1} style={{ flexShrink: 1 }}>
            {place.name}
          </Banner>
        </View>
      </View>
    </Pressable>
  );
}

function reasonText(r: ReasonTag, t: (k: string) => string): string {
  return t(r.key).replace('{x}', r.arg || '');
}

/** The single best-fit pick for this foodie — quality × taste. */
/** A venue's cover on feed cards: its real photo (site / guide / Google) when known, else its generated cover. */
function FeedCover({ p, height, crest, border, darken }: { p: Place; height: number; crest: number; border?: boolean; darken?: number }) {
  const pic = staticCover(p);
  return (
    <PlaceCover
      place={p}
      photoUrl={pic?.url}
      fallbackUrl={pic?.fallback}
      credit={pic?.credit.replace(/^(Photo|Still):\s*/, '')}
      style={{ width: '100%', height, ...(border ? { borderBottomWidth: 2, borderColor: C.inkBlack } : null) }}
      crestSize={crest}
      darken={darken}
    />
  );
}

/** A compact "new & rising" card for the CDMX guide rail. */
/**
 * New & Rising, as a spotlight: one new restaurant at a time, full width — its
 * cover with its chef and iconic dishes floating on it, the stamp (New 2026 /
 * Rising), then its name and what it is. Swipe through, or let it turn on its
 * own (it stops the moment you swipe, and never moves with reduced motion).
 */
function RisingSpotlight({ places }: { places: Place[] }) {
  const openPlace = useStore((s) => s.openPlace);
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const ref = useRef<ScrollView>(null);
  const touched = useRef(false);
  useEffect(() => {
    let still = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => (still = !!v)).catch(() => {});
    const timer = setInterval(() => {
      if (still || touched.current || !w) return;
      setIdx((i) => {
        const n = (i + 1) % places.length;
        ref.current?.scrollTo({ x: n * (w + 12), animated: true });
        return n;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [w, places.length]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ gap: 8 }}>
      {w ? (
        <ScrollView
          ref={ref}
          horizontal
          snapToInterval={w + 12}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 6, paddingRight: 6 }}
          onScrollBeginDrag={() => (touched.current = true)}
          onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / (w + 12)))}
          scrollEventThrottle={64}
        >
          {places.map((p, i) => {
            const neo = p.moment === 'Apertura 2026';
            return (
              <StickerPressable key={p.id} offset="lg" onPress={() => openPlace(p.id)} accessibilityLabel={`New & Rising: ${p.name}`} style={{ width: w, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
                <View style={{ height: 236 }}>
                  <VenueCover place={p} style={{ width: '100%', height: '100%' }} crestSize={74} darken={0.2} credit={false} />
                  {Math.abs(i - idx) <= 1 ? <FloatingBubbles place={p} max={5} inset={40} skip={['new']} /> : null}
                  <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: neo ? C.stampGreen : C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: '-4deg' }] }}>
                    <Banner s={9} tk={0.12} c={neo ? C.paper0 : C.inkDeep}>
                      {neo ? 'New · 2026' : 'Rising'}
                    </Banner>
                  </View>
                  <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(27,16,4,0.66)', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                    <Mono s={9} c={C.paper0}>
                      {i + 1} / {places.length}
                    </Mono>
                  </View>
                </View>
                <View style={{ padding: 12, gap: 4, borderTopWidth: 2.5, borderColor: C.inkBlack }}>
                  <Display s={20} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 22 }}>
                    {p.name}
                  </Display>
                  <Mono s={9} c={C.inkMuted} numberOfLines={1}>
                    {[p.category || p.cuisine, p.hood, p.ticket].filter(Boolean).join(' · ')}
                  </Mono>
                  {p.why || p.blurb ? (
                    <Serif s={12} c={C.inkSoft} numberOfLines={2} style={{ lineHeight: 16, marginTop: 2 }}>
                      {p.why || p.blurb}
                    </Serif>
                  ) : null}
                </View>
              </StickerPressable>
            );
          })}
        </ScrollView>
      ) : null}
      {/* the page dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
        {places.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => {
              touched.current = true;
              setIdx(i);
              ref.current?.scrollTo({ x: i * (w + 12), animated: true });
            }}
            accessibilityLabel={`Show ${p.name}`}
            hitSlop={6}
            style={{ width: i === idx ? 18 : 8, height: 8, borderRadius: 4, backgroundColor: i === idx ? C.ink400 : C.paper0, borderWidth: 1.5, borderColor: C.inkBlack }}
          />
        ))}
      </View>
    </View>
  );
}

/** A chef in the "behind the plates" rail — monogram, name, footprint. */
function ChefChip({ chef }: { chef: Chef }) {
  const openChef = useStore((s) => s.openChef);
  const multi = chef.placeIds.length > 1;
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openChef(chef.id)}
      style={{ width: 128, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 11, alignItems: 'center', gap: 8 }}
    >
      <Monogram name={chef.name} size={52} rot="-5deg" />
      <SerifDisplay s={13} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 15, textAlign: 'center' }}>
        {chef.name}
      </SerifDisplay>
      <View style={{ backgroundColor: multi ? C.sun400 : C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
        <Banner s={7.5} tk={0.06} c={C.inkDeep}>
          {multi ? `${chef.placeIds.length} restaurants` : chef.topAward || 'Chef'}
        </Banner>
      </View>
    </StickerPressable>
  );
}

/** A restaurant group in the feed rail — crest, name, how many rooms. */
function GroupChip({ group }: { group: Group }) {
  const openGroup = useStore((s) => s.openGroup);
  const n = group.placeIds.length;
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openGroup(group.id)}
      style={{ width: 150, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 11, alignItems: 'center', gap: 8 }}
    >
      <Monogram name={group.crest} size={52} rot="-5deg" />
      <SerifDisplay s={13} c={C.inkDeep} numberOfLines={2} style={{ lineHeight: 15, textAlign: 'center', minHeight: 30 }}>
        {group.name}
      </SerifDisplay>
      <View style={{ backgroundColor: group.kind === 'named' ? C.sun400 : C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
        <Banner s={7.5} tk={0.06} c={C.inkDeep}>
          {n} {n === 1 ? 'restaurant' : 'restaurants'}
          {group.also.length ? ` +${group.also.length}` : ''}
        </Banner>
      </View>
    </StickerPressable>
  );
}

function TopPick({ rec }: { rec: Rec }) {
  const openPlace = useStore((s) => s.openPlace);
  const t = useT();
  const p = rec.place;
  return (
    <StickerPressable offset="lg" onPress={() => openPlace(p.id)} style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <View style={{ position: 'relative' }}>
        <FeedCover p={p} height={152} crest={72} darken={0.5} />
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.paper0, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: '-3deg' }] }}>
          <Banner s={9} tk={0.14} c={C.paper0}>
            {t('feed.topPick')}
          </Banner>
        </View>
        <View style={{ position: 'absolute', top: 8, right: 10, alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.sun400, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
            <Display s={18} c={C.inkDeep}>
              {rec.score}
            </Display>
          </View>
          <Banner s={7} tk={0.1} c={C.paper0} style={{ marginTop: 2 }}>
            {t('feed.forYouScore')}
          </Banner>
        </View>
      </View>
      <View style={{ padding: 13 }}>
        <SerifDisplay s={18} c={C.inkDeep} numberOfLines={1}>
          {p.name}
        </SerifDisplay>
        <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }} numberOfLines={1}>
          {p.cuisine} · {p.hood}
          {typeof p.rating === 'number' ? ` · ★ ${p.rating.toFixed(1)}${p.reviews ? ` (${p.reviews > 999 ? (p.reviews / 1000).toFixed(1) + 'k' : p.reviews})` : ''}` : ''}
        </Mono>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          {rec.reasons.map((r, i) => (
            <View key={i} style={{ backgroundColor: C.sun100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
              <Banner s={8.5} tk={0.03} c={C.inkDeep}>
                {reasonText(r, t)}
              </Banner>
            </View>
          ))}
        </View>
      </View>
    </StickerPressable>
  );
}

/** Compact recommendation card for the runner-up strip. */
function RecMini({ rec }: { rec: Rec }) {
  const openPlace = useStore((s) => s.openPlace);
  const t = useT();
  const p = rec.place;
  return (
    <StickerPressable offset="sm" onPress={() => openPlace(p.id)} style={{ width: 152, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <View style={{ position: 'relative' }}>
        <FeedCover p={p} height={88} crest={40} />
        <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 26, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Display s={12} c={C.inkDeep}>
            {rec.score}
          </Display>
        </View>
      </View>
      <View style={{ padding: 8, gap: 3 }}>
        <SerifDisplay s={13} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 14 }}>
          {p.name}
        </SerifDisplay>
        <Mono s={8.5} c={C.inkSoft} numberOfLines={1}>
          {reasonText(rec.reasons[0], t)}
        </Mono>
      </View>
    </StickerPressable>
  );
}

function ActivityCard({ item, index }: { item: Extract<(typeof FEED)[number], { kind: 'act' }>; index: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const toggleLike = useStore((s) => s.toggleLike);
  const toggleSave = useStore((s) => s.toggleSave);
  const liked = useStore((s) => !!s.liked['f' + index]);
  const savedOn = useStore((s) => !!s.saved[item.placeId]);
  const p = byId[item.placeId];
  const ss = item.score != null ? scoreStyle(item.score) : null;

  return (
    <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: col(item.color),
            borderWidth: 2,
            borderColor: C.inkBlack,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Banner s={11} c={C.paper0}>
            {item.initials}
          </Banner>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Serif s={13.5} style={{ lineHeight: 18, color: C.inkBlack }}>
            <Banner s={12} tk={0.04} c={C.inkDeep}>
              {item.who}
            </Banner>
            <Serif s={13.5}> {item.verb}</Serif>
          </Serif>
        </View>
        <Mono s={9.5} c={C.inkSoft}>
          {item.time}
        </Mono>
      </View>

      <Pressable onPress={() => openPlace(item.placeId)} style={{ borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.inkBlack }}>
        <VenueCover place={p} style={{ width: '100%', height: 200 }} crestSize={56} />
        <View style={{ position: 'absolute', left: 12, bottom: 12, right: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 6, paddingHorizontal: 11, maxWidth: '74%' }}>
            <SerifDisplay s={15} c={C.inkDeep} style={{ lineHeight: 16 }}>
              {p.name}
            </SerifDisplay>
            <Mono s={9} c={C.inkMuted} style={{ marginTop: 2 }}>
              {item.meta}
            </Mono>
          </StickerView>
          {ss ? (
            <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: '-6deg' }] }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: ss.bg,
                  borderWidth: 2.5,
                  borderColor: C.inkBlack,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Display s={18} c={ss.fg}>
                  {fmt(item.score!)}
                </Display>
              </View>
            </StickerView>
          ) : null}
        </View>
      </Pressable>

      <Serif s={14} style={{ paddingHorizontal: 14, paddingTop: 11, paddingBottom: 4, lineHeight: 21 }}>
        {item.caption}
      </Serif>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12 }}>
        <Pressable onPress={() => toggleLike('f' + index)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <HeartIcon size={18} color={liked ? C.ink400 : C.inkMuted} filled={liked} />
          <Mono s={12} c={liked ? C.ink400 : C.inkMuted}>
            {item.likes + (liked ? 1 : 0)}
          </Mono>
        </Pressable>
        <Pressable onPress={() => openPlace(item.placeId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <CommentIcon size={17} color={C.inkMuted} />
          <Mono s={12} c={C.inkMuted}>
            {item.comments}
          </Mono>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => toggleSave(item.placeId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <BookmarkIcon size={16} color={savedOn ? C.stampGreen : C.inkMuted} filled={savedOn} />
          <Banner s={10} tk={0.12} c={savedOn ? C.stampGreen : C.inkMuted}>
            {savedOn ? 'Saved' : 'Want to try'}
          </Banner>
        </Pressable>
      </View>
    </StickerView>
  );
}

function ClubTeaser() {
  const goClub = useStore((s) => s.goClub);
  return (
    <StickerPressable
      offset="sm"
      onPress={goClub}
      style={{
        backgroundColor: C.paper0,
        borderWidth: 2.5,
        borderColor: C.inkBlack,
        borderStyle: 'dashed',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: C.ink400,
          borderWidth: 2,
          borderColor: C.inkBlack,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-5deg' }],
        }}
      >
        <GlobeMark size={28} color={C.paper0} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Banner s={9} tk={0.16} c={C.ink400}>
          Dine Club · members table
        </Banner>
        <SerifDisplay s={16} c={C.inkDeep} style={{ marginTop: 2, lineHeight: 17 }}>
          Mole Negro Study Nº 04
        </SerifDisplay>
        <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }}>
          Aug 02 · 10 seats · secret address
        </Mono>
      </View>
      <View style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
        <Banner s={9} tk={0.12} c={C.inkDeep}>
          Open →
        </Banner>
      </View>
    </StickerPressable>
  );
}

/**
 * A real critic from the clips — their best take, read by CRTQ (simulated
 * verdict + score, their own words quoted). Opens their critic profile.
 */
function CriticCard({ critic }: { critic: Critic }) {
  const openCritic = useStore((s) => s.openCritic);
  const nearbyById = useStore((s) => s.nearbyById);
  const following = useStore((s) => !!s.follows['critic:' + critic.id]);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const top = critic.takes[0];
  const place = top ? resolvePlace(top.placeId, nearbyById) : undefined;
  const col = top ? VERDICT_COLOR[top.verdict] : { bg: C.paper0, fg: C.inkDeep };
  return (
    <StickerPressable
      offset="lg"
      onPress={() => openCritic(critic.id)}
      accessibilityLabel={`Critic: ${critic.name}`}
      style={{ width: 286, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12 }}>
        <Monogram name={critic.name} size={40} rot="-4deg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={11} tk={0.04} c={C.inkDeep} numberOfLines={1}>
            {critic.name}
          </Banner>
          <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 1 }} numberOfLines={1}>
            {[critic.handle, critic.platforms.map((p) => SOURCE_LABEL[p]).join(' · ')].join(' · ')}
          </Mono>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => toggleFollow('critic:' + critic.id)}
          accessibilityLabel={following ? `Following ${critic.name}` : `Follow ${critic.name}`}
          style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.ink400, paddingVertical: 6, paddingHorizontal: 10 }}
        >
          <Banner s={8.5} tk={0.1} c={C.paper0}>
            {following ? 'Following' : 'Follow'}
          </Banner>
        </StickerPressable>
      </View>
      {top && place ? (
        <View style={{ borderTopWidth: 2, borderColor: C.inkBlack, backgroundColor: C.sun100, paddingVertical: 10, paddingHorizontal: 12, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <SerifDisplay s={14} c={C.inkDeep} numberOfLines={1}>
                {place.name}
              </SerifDisplay>
              <VerdictStamp v={top.verdict} small />
            </View>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: col.bg, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
                <Display s={15} c={col.fg}>
                  {top.score.toFixed(1)}
                </Display>
              </View>
              <SimTag />
            </View>
          </View>
          <Serif s={12.5} c={C.inkDeep} numberOfLines={3} style={{ lineHeight: 17 }}>
            {top.kind === 'clip' ? `“${top.quote}”` : top.quote}
          </Serif>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 2, borderColor: C.inkBlack }}>
        <View style={{ backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
          <Banner s={7.5} tk={0.1} c={C.paper0}>
            {critic.kind === 'outlet' ? 'Food media' : 'Creator'}
          </Banner>
        </View>
        <Mono s={8.5} c={C.inkMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
          {critic.takes.length} {critic.takes.length === 1 ? 'restaurant' : 'restaurants'} · {critic.clipCount} {critic.clipCount === 1 ? 'clip' : 'clips'}
        </Mono>
      </View>
    </StickerPressable>
  );
}

type FeedSection = 'foryou' | 'rising' | 'clips' | 'reviews' | 'fresh';
const FEED_SECTIONS: { key: FeedSection; label: string }[] = [
  { key: 'foryou', label: 'For You' },
  { key: 'rising', label: 'New & Rising' },
  { key: 'clips', label: 'Clips' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'fresh', label: 'Fresh Finds' },
];

/** A feed section's heading: its number, its name, and a note or link on the right. */
function SectionHead({ n, title, sub, right }: { n: number; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
        <Mono s={9} c={C.paper0}>
          {n}
        </Mono>
      </View>
      <Banner s={12} tk={0.14} c={C.inkDeep} style={{ flexShrink: 1 }} numberOfLines={1}>
        {title}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {right || (sub ? (
        <Mono s={9} c={C.inkSoft} numberOfLines={1}>
          {sub}
        </Mono>
      ) : null)}
    </View>
  );
}

export function Feed() {
  const insets = useSafeAreaInsets();
  const tapLogo = useStore((s) => s.tapLogo);
  const goMap = useStore((s) => s.openMap);
  const openClips = useStore((s) => s.openClips);
  const goBoard = useStore((s) => s.go);
  const openReel = useStore((s) => s.openReel);
  const clubUnlocked = useStore((s) => s.clubUnlocked);
  const city = useStore((s) => s.city);
  const openCitySheet = useStore((s) => s.openCitySheet);
  const nearby = useStore((s) => s.nearby);
  const nearbyStatus = useStore((s) => s.nearbyStatus);
  const openPlaceFromFeed = useStore((s) => s.openPlace);
  const monthlyTrending = useStore((s) => s.monthlyTrending);
  const monthlyTrendingStatus = useStore((s) => s.monthlyTrendingStatus);
  const loadMonthlyTrending = useStore((s) => s.loadMonthlyTrending);
  const placeVideos = useStore((s) => s.placeVideos);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const wantIds = useStore((s) => s.wantIds);
  const t = useT();
  const [behind, setBehind] = useState<'chefs' | 'groups'>('chefs');
  const [forCat, setForCat] = useState<FavCat | 'all'>('all');
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<FeedSection, number>>>({});
  const mark = (k: FeedSection) => (e: { nativeEvent: { layout: { y: number } } }) => (sectionY.current[k] = e.nativeEvent.layout.y);
  const jump = (k: FeedSection) => scrollRef.current?.scrollTo({ y: Math.max(0, (sectionY.current[k] || 0) - 8), animated: true });

  // The ideal picks for this foodie, from the live venues (quality × taste fit).
  const recs = useMemo(() => {
    if (!nearby.length) return [];
    const palate = computePalate(ranked, tastes, userReviews);
    const beenIds = new Set(ranked.map((r) => r.id));
    const wantSet = new Set(wantIds);
    const pool = forCat === 'all' ? nearby : nearby.filter((p) => categoryOf(p) === forCat);
    return recommend(pool, { palate, tastes, beenIds, wantIds: wantSet }).slice(0, 7);
  }, [nearby, ranked, tastes, userReviews, wantIds, forCat]);
  // How many options each category holds nearby — the chips say so.
  const catCounts = useMemo(() => {
    const m: Partial<Record<FavCat, number>> = {};
    nearby.forEach((p) => {
      const c = categoryOf(p);
      m[c] = (m[c] || 0) + 1;
    });
    return m;
  }, [nearby]);
  const friendReviews = FEED.filter((it) => it.kind === 'act').slice(0, 4);

  // Rank the most-mentioned restaurants this month (cached; recomputes ~daily).
  useEffect(() => {
    loadMonthlyTrending();
  }, [loadMonthlyTrending, city.id, nearby.length > 0]);

  const trendLive = monthlyTrendingStatus === 'ready' && monthlyTrending.length > 0;

  // The same clip stream the Clips screen plays, so a preview opens right where it sits.
  const clipFeed = useMemo(
    () => buildClipFeed(nearby, [...Object.values(placeVideos).flat(), ...monthlyTrending.map((m) => m.video)]),
    [nearby, placeVideos, monthlyTrending],
  );

  return (
    <ScreenIn>
      {/* header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: C.sun400, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <Grain opacity={0.06} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={tapLogo} accessibilityLabel="CRTQ">
            <Image source={BRAND.logo} style={{ width: 46, height: 46, transform: [{ rotate: '-6deg' }] }} resizeMode="contain" />
            {clubUnlocked ? (
              <View style={{ position: 'absolute', top: -1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.paper0 }} />
            ) : null}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Display s={19} c={C.inkDeep} numberOfLines={1}>
              CRTQ
            </Display>
            <Pressable onPress={openCitySheet} hitSlop={8}>
              <Mono s={9} c={C.ink600} style={{ marginTop: 4 }} numberOfLines={1}>
                {city.flag} {city.name.toUpperCase()} · {city.weather} ▾
              </Mono>
            </Pressable>
          </View>
          <HeaderIconButton onPress={() => openClips()} label="Clips">
            <PlayIcon size={14} color={C.ink400} />
          </HeaderIconButton>
          <HeaderIconButton onPress={goMap} label="Nearby map">
            <MapIcon size={16} color={C.ink400} />
          </HeaderIconButton>
          <HeaderIconButton onPress={() => goBoard('board' as any)} label="Leaderboard">
            <ChartIcon size={16} color={C.ink400} />
          </HeaderIconButton>
        </View>
      </View>

      {/* jump to a section */}
      <View style={{ height: 46, flexShrink: 0, backgroundColor: C.paper50, borderBottomWidth: 2, borderBottomColor: C.inkBlack }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, alignItems: 'center', height: 44 }}>
        {FEED_SECTIONS.map((x, i) => (
          <Pressable key={x.key} onPress={() => jump(x.key)} accessibilityLabel={`Go to ${x.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: C.paper0 }}>
            <Mono s={8.5} c={C.ink400}>
              {i + 1}
            </Mono>
            <Banner s={9} tk={0.08} c={C.inkDeep}>
              {x.label}
            </Banner>
          </Pressable>
        ))}
      </ScrollView>
      </View>

      {/* body: 1 For You · 2 New & Rising · 3 Clips · 4 Reviews · 5 Fresh Finds */}
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 22 }} showsVerticalScrollIndicator={false}>
        {/* 1 — For You: quality × your taste, from the live venues; tap a category for its options */}
        <View onLayout={mark('foryou')} style={{ gap: 10 }}>
          <SectionHead n={1} title="For You" sub={t('feed.forYouSub')} />
          {nearby.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 4 }}>
              {[{ id: 'all' as const, label: 'Everything' }, ...FAV_CATS].map((x) =>
                x.id === 'all' || catCounts[x.id] ? (
                  <Pressable
                    key={x.id}
                    onPress={() => setForCat(x.id)}
                    accessibilityLabel={`For you: ${x.label}`}
                    accessibilityState={{ selected: forCat === x.id }}
                    style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, backgroundColor: forCat === x.id ? C.ink400 : C.paper0 }}
                  >
                    <Banner s={9} tk={0.06} c={forCat === x.id ? C.paper0 : C.inkDeep}>
                      {x.label} {x.id === 'all' ? nearby.length : catCounts[x.id]}
                    </Banner>
                  </Pressable>
                ) : null,
              )}
            </ScrollView>
          ) : null}
          {recs.length ? (
            <View>
              <TopPick rec={recs[0]} />
              {recs.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 4, paddingRight: 4 }}>
                  {recs.slice(1).map((rec) => (
                    <RecMini key={rec.place.id} rec={rec} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : nearbyStatus === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={C.ink400} />
              <Mono s={10} c={C.inkSoft}>
                Finding your picks in {city.name}…
              </Mono>
            </View>
          ) : (
            <Mono s={10} c={C.inkSoft}>
              {forCat === 'all' ? 'Rank a few places and your picks land here.' : 'You’ve been to all of these nearby — try another category.'}
            </Mono>
          )}
        </View>

        {/* 2 — New & Rising: 2026 openings and newly acclaimed spots, and who's behind them */}
        {city.id === 'cdmx' && CARTE_RISING.length ? (
          <View onLayout={mark('rising')} style={{ gap: 10 }}>
            <SectionHead n={2} title="New & Rising" sub="Guía CDMX 2026" />
            <RisingSpotlight places={CARTE_RISING.slice(0, 12)} />
            {FEATURED_CHEFS.length || GROUPS.length ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Banner s={9} tk={0.14} c={C.inkMuted}>
                    Who's behind it
                  </Banner>
                  <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden' }}>
                    {(['chefs', 'groups'] as const).map((k) => (
                      <Pressable key={k} onPress={() => setBehind(k)} accessibilityRole="tab" accessibilityState={{ selected: behind === k }} style={{ paddingVertical: 4, paddingHorizontal: 11, backgroundColor: behind === k ? C.inkDeep : C.paper0 }}>
                        <Banner s={8.5} tk={0.08} c={behind === k ? C.paper0 : C.inkDeep}>
                          {k === 'chefs' ? `Chefs ${FEATURED_CHEFS.length}` : `Groups ${GROUPS.length}`}
                        </Banner>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
                  {behind === 'chefs' ? FEATURED_CHEFS.map((c) => <ChefChip key={c.id} chef={c} />) : GROUPS.map((g) => <GroupChip key={g.id} group={g} />)}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 3 — Clips: vertical previews pinned to their restaurants, and this month's most-filmed */}
        {clipFeed.length || trendLive || monthlyTrendingStatus === 'loading' ? (
          <View onLayout={mark('clips')} style={{ gap: 10 }}>
            <SectionHead
              n={3}
              title="Clips"
              right={
                clipFeed.length ? (
                  <Pressable onPress={() => openClips()} accessibilityLabel="Watch all clips" hitSlop={8}>
                    <Mono s={9} c={C.ink400}>
                      watch all {clipFeed.length} →
                    </Mono>
                  </Pressable>
                ) : undefined
              }
            />
            {clipFeed.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
                {clipFeed.slice(0, 12).map((it) => (
                  <ClipPreview key={it.clip.id} item={it} />
                ))}
              </ScrollView>
            ) : null}
            {trendLive || monthlyTrendingStatus === 'loading' ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Banner s={9} tk={0.14} c={C.inkMuted}>
                    {t('feed.trending')}
                  </Banner>
                  {monthlyTrendingStatus === 'loading' ? <ActivityIndicator size="small" color={C.ink400} /> : <Mono s={9} c={C.inkSoft}>{t('feed.trendingSub')}</Mono>}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
                  {monthlyTrending.map((it, i) => (
                    <MonthlyTrendCard key={it.placeId} item={it} rank={i + 1} />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 4 — Reviews: the critics (house critic first), then your friends' latest */}
        <View onLayout={mark('reviews')} style={{ gap: 10 }}>
          <SectionHead
            n={4}
            title="Reviews"
            right={
              <Pressable onPress={() => goBoard('board' as any)} accessibilityLabel="All critics" hitSlop={8}>
                <Mono s={9} c={C.ink400}>
                  all critics →
                </Mono>
              </Pressable>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingRight: 4 }}>
            {HOUSE_CRITICS.map((c) => (
              <HouseCriticCard key={c.id} c={c} />
            ))}
            {FEATURED_CRITICS.map((c) => (
              <CriticCard key={c.id} critic={c} />
            ))}
          </ScrollView>
          {friendReviews.length ? (
            <View style={{ gap: 12 }}>
              <Banner s={9} tk={0.14} c={C.inkMuted}>
                From your table
              </Banner>
              {friendReviews.map((it, i) => (it.kind === 'act' ? <ActivityCard key={i} item={it} index={i} /> : null))}
            </View>
          ) : null}
          {clubUnlocked && FEED.some((it) => it.kind === 'club') ? <ClubTeaser /> : null}
        </View>

        {/* 5 — Fresh Finds: a new hand of discovered spots on every visit, and the live places near you */}
        <View onLayout={mark('fresh')} style={{ gap: 10 }}>
          <SectionHead
            n={5}
            title="Fresh Finds"
            right={
              <Pressable onPress={openCitySheet} hitSlop={6}>
                <Mono s={9} c={C.inkSoft}>
                  {city.name} · change ▾
                </Mono>
              </Pressable>
            }
          />
          {city.id === 'cdmx' ? <FreshFinds /> : null}
          {nearby.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Banner s={9} tk={0.14} c={C.inkMuted}>
                  {t('feed.fresh')}
                </Banner>
                <CacheChip />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {nearby.slice(0, 12).map((p) => (
                  <StickerPressable key={p.id} offset="sm" onPress={() => openPlaceFromFeed(p.id)} style={{ width: 128, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
                    <FeedCover p={p} height={84} crest={38} border />
                    <View style={{ padding: 8 }}>
                      <SerifDisplay s={13} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 14 }}>
                        {p.name}
                      </SerifDisplay>
                      <Mono s={8.5} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
                        {p.cuisine} · {p.price}
                      </Mono>
                    </View>
                  </StickerPressable>
                ))}
              </ScrollView>
            </View>
          ) : nearbyStatus === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
              <ActivityIndicator size="small" color={C.ink400} />
              <Mono s={10} c={C.inkSoft}>
                Finding fresh spots near {city.name}…
              </Mono>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenIn>
  );
}
