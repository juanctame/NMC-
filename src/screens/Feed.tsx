/**
 * Feed (home) — social home: trending strip, friends' activity, personalized
 * recs, and (once unlocked) the Dine Club teaser.
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { FEED, RECS, byId } from '../store/data';
import { CREATOR_REVIEWS, PLATFORM_LABEL } from '../data/creators';
import { TRENDING_VIDEOS, embedUrlFor, type TrendingVideo } from '../data/videos';
import type { BuzzResult } from '../data/trending';

const PLATFORM_TAG: Record<string, string> = { tiktok: 'TT', instagram: 'IG', youtube: 'YT' };
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { col } from '../theme/tokens';
import { photo, BRAND } from '../assets';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
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

function TrendingThumb({ video, rank, onPress }: { video: TrendingVideo; rank: number; onPress: () => void }) {
  const p = byId[video.placeId];
  return (
    <StickerPressable
      offset="sm"
      onPress={onPress}
      style={{
        width: 96,
        borderWidth: 2.5,
        borderColor: C.inkBlack,
        backgroundColor: C.ink700,
        overflow: 'hidden',
      }}
    >
      <Photo source={photo(p.photo)} style={{ width: '100%', height: 120 }} darken={0.16} warm={0.06} />
      <View style={{ position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
        <Display s={10} c={C.inkDeep}>
          {rank}
        </Display>
      </View>
      {/* platform badge */}
      <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 5 }}>
        <Banner s={7.5} tk={0.06} c={C.paper0}>
          {PLATFORM_TAG[video.platform]}
        </Banner>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(251,245,229,0.92)', borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <PlayIcon size={12} color={C.ink400} />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.inkBlack }}>
        <Banner s={8} tk={0.06} c={C.paper0} numberOfLines={1}>
          {video.handle}
        </Banner>
      </View>
    </StickerPressable>
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
  const openVideo = useStore((s) => s.openVideo);
  const openPlace = useStore((s) => s.openPlace);
  const t = useT();
  const url = embedUrlFor(item.video);
  return (
    <View style={{ width: 168, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      {/* hero clip */}
      <Pressable
        onPress={() => url && openVideo(url + '&autoplay=1')}
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
            YouTube
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
        {item.appCreatorId && item.appCreatorPlaceId ? (
          <Pressable
            onPress={() => openPlace(item.appCreatorPlaceId!)}
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
        <Photo source={photo(p.photo)} style={{ width: '100%', height: 200 }} />
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

function RecCard({ placeId, reason, match }: { placeId: string; reason: string; match: string }) {
  const openPlace = useStore((s) => s.openPlace);
  const p = byId[placeId];
  return (
    <StickerPressable
      offset="lg"
      onPress={() => openPlace(placeId)}
      style={{ flexDirection: 'row', backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}
    >
      <Photo source={photo(p.photo)} style={{ width: 92, borderRightWidth: 2.5, borderColor: C.inkBlack }} />
      <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14 }}>
        <Banner s={9} tk={0.16} c={C.sun400}>
          Recommended for you
        </Banner>
        <SerifDisplay s={17} c={C.paper0} style={{ marginTop: 4, lineHeight: 19 }}>
          {p.name}
        </SerifDisplay>
        <Mono s={9.5} c={C.ink100} style={{ marginTop: 4 }}>
          {reason}
        </Mono>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Banner s={10} tk={0.08} c={C.inkDeep}>
              {match} match
            </Banner>
          </View>
        </View>
      </View>
    </StickerPressable>
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

function CreatorCard({ cr }: { cr: (typeof CREATOR_REVIEWS)[number] }) {
  const openPlace = useStore((s) => s.openPlace);
  const [following, setFollowing] = useState(false);
  const p = byId[cr.placeId];
  const ss = scoreStyle(cr.score);
  return (
    <StickerView offset="lg" style={{ width: 300, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: col(cr.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Banner s={12} c={C.paper0}>
            {cr.initials}
          </Banner>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Banner s={11} tk={0.04} c={C.inkDeep} numberOfLines={1}>
              {cr.creator}
            </Banner>
            {cr.verified ? (
              <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Display s={7} c={C.paper0}>
                  ✓
                </Display>
              </View>
            ) : null}
          </View>
          <Mono s={9} c={C.inkSoft} style={{ marginTop: 1 }}>
            {cr.handle} · {cr.followers}
          </Mono>
        </View>
        <StickerPressable offset="sm" radius={999} onPress={() => setFollowing((v) => !v)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: following ? C.stampGreen : C.ink400, paddingVertical: 6, paddingHorizontal: 11 }}>
          <Banner s={9} tk={0.1} c={C.paper0}>
            {following ? 'Following' : 'Follow'}
          </Banner>
        </StickerPressable>
      </View>
      <Pressable onPress={() => openPlace(cr.placeId)} style={{ borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.inkBlack }}>
        <Photo source={photo(p.photo)} style={{ width: '100%', height: 120 }} />
        <View style={{ position: 'absolute', left: 10, bottom: 10 }}>
          <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 4, paddingHorizontal: 9 }}>
            <SerifDisplay s={13} c={C.inkDeep}>
              {p.name}
            </SerifDisplay>
          </StickerView>
        </View>
        <View style={{ position: 'absolute', right: 10, bottom: 10, transform: [{ rotate: '-6deg' }] }}>
          <StickerView offset="sm" radius={999}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: ss.bg, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={16} c={ss.fg}>
                {fmt(cr.score)}
              </Display>
            </View>
          </StickerView>
        </View>
      </Pressable>
      <Serif s={13} style={{ paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6, lineHeight: 19 }}>
        {cr.text}
      </Serif>
      <Pressable onPress={() => Linking.openURL(cr.sourceUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
          <PlayIcon size={9} color={C.paper0} />
          <Banner s={8.5} tk={0.1} c={C.paper0}>
            {PLATFORM_LABEL[cr.platform]}
          </Banner>
        </View>
        <Banner s={9.5} tk={0.1} c={C.ink400}>
          Watch the clip →
        </Banner>
      </Pressable>
    </StickerView>
  );
}

export function Feed() {
  const insets = useSafeAreaInsets();
  const tapLogo = useStore((s) => s.tapLogo);
  const goMap = useStore((s) => s.openMap);
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
  const t = useT();

  // Rank the most-mentioned restaurants this month (cached; recomputes ~daily).
  useEffect(() => {
    loadMonthlyTrending();
  }, [loadMonthlyTrending, city.id]);

  const trendLive = monthlyTrendingStatus === 'ready' && monthlyTrending.length > 0;

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
          <HeaderIconButton onPress={goMap} label="Nearby map">
            <MapIcon size={16} color={C.ink400} />
          </HeaderIconButton>
          <HeaderIconButton onPress={() => goBoard('board' as any)} label="Leaderboard">
            <ChartIcon size={16} color={C.ink400} />
          </HeaderIconButton>
        </View>
      </View>

      {/* body */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Banner s={11} tk={0.14} c={C.inkDeep}>
              {t('feed.trending')}
            </Banner>
            {monthlyTrendingStatus === 'loading' ? (
              <ActivityIndicator size="small" color={C.ink400} />
            ) : (
              <Mono s={9} c={C.inkSoft}>
                {trendLive ? t('feed.trendingSub') : 'TikTok · Reels · Shorts →'}
              </Mono>
            )}
          </View>
          {trendLive ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
              {monthlyTrending.map((it, i) => (
                <MonthlyTrendCard key={it.placeId} item={it} rank={i + 1} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {TRENDING_VIDEOS.map((v, i) => (
                <TrendingThumb key={v.id} video={v} rank={i + 1} onPress={() => openReel(i)} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Tastemakers — featured creators, the content we promote */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Banner s={11} tk={0.14} c={C.inkDeep}>
              {t('feed.tastemakers')}
            </Banner>
            <Mono s={9} c={C.inkSoft}>
              creators we love →
            </Mono>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingRight: 4 }}>
            {CREATOR_REVIEWS.map((cr) => (
              <CreatorCard key={cr.id} cr={cr} />
            ))}
          </ScrollView>
        </View>

        {/* Fresh near you — live places for the selected city */}
        {nearby.length > 0 ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Banner s={11} tk={0.14} c={C.inkDeep}>
                {t('feed.fresh')}
              </Banner>
              <Pressable onPress={openCitySheet} hitSlop={6}>
                <Mono s={9} c={C.inkSoft}>
                  {city.name} · change ▾
                </Mono>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {nearby.slice(0, 12).map((p) => (
                <StickerPressable
                  key={p.id}
                  offset="sm"
                  onPress={() => openPlaceFromFeed(p.id)}
                  style={{ width: 128, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}
                >
                  <Photo source={photo(p.photo)} style={{ width: '100%', height: 84, borderBottomWidth: 2, borderColor: C.inkBlack }} />
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

        {FEED.map((it, i) => {
          if (it.kind === 'act') return <ActivityCard key={i} item={it} index={i} />;
          if (it.kind === 'rec') return <RecCard key={i} placeId={it.placeId} reason={it.reason} match={it.match} />;
          if (it.kind === 'club') return clubUnlocked ? <ClubTeaser key={i} /> : null;
          return null;
        })}
      </ScrollView>
    </ScreenIn>
  );
}
