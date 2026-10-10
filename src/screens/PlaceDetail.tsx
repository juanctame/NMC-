/**
 * Place detail — hero, dual Rotten-Tomatoes rankings (Critics + People, ranked
 * independently overall and per-cuisine), a Google Maps card, community photo
 * gallery with upload, friends who've been, a reservation card, and want/rank
 * CTAs.
 */
import React, { useEffect } from 'react';
import { View, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace, reviewsFor, popularDishFor, type ScoredReview } from '../store/useStore';
import { RANK } from '../store/data';
import { scoreStyle, verdictOf, fmt, metaOf } from '../store/helpers';
import { embedUrlFor, type TrendingVideo } from '../data/videos';
import { hashtagOf, hashtagLinks, TAG_PLATFORMS } from '../data/hashtags';
import { PLATFORM_LABEL } from '../data/creators';
import { youtubeEnabled } from '../data/videosLive';
import { computePalate } from '../data/palate';
import { drawAndKnow, priceLabel, fitFor, type GReview } from '../data/placeDetails';
import { combosFor, peerComparison, currencyCode, type Combo, type ValueRow } from '../data/combos';
import { chefForPlace } from '../data/chefs';
import { useT } from '../i18n';
import { C, col } from '../theme/tokens';
import { photo, PHOTO_POOL } from '../assets';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { Monogram } from '../components/Monogram';
import { PlaceCover } from '../components/Cover';
import { Roundel } from '../components/Roundel';
import { PlusIcon, BookmarkIcon, HeartIcon, PlayIcon, MapIcon, GlobeMark } from '../components/icons';
import { ScreenIn } from '../components/Anim';

function TogglePill({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13, backgroundColor: on ? C.ink400 : C.paper0 }}>
      <Banner s={10} tk={0.1} c={on ? C.paper0 : C.inkDeep}>
        {label}
      </Banner>
    </Pressable>
  );
}

function ReviewCard({ r, onLike }: { r: ScoredReview; onLike: () => void }) {
  const ss = scoreStyle(r.score);
  const tag = r.authorId === 'me' ? 'You' : r.critic ? 'Critic' : r.friend ? 'Friend' : null;
  const tagBg = r.authorId === 'me' ? C.sun400 : r.critic ? C.ink400 : C.stampGreen;
  const tagFg = r.authorId === 'me' ? C.inkDeep : C.paper0;
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col(r.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Banner s={11} c={C.paper0}>
            {r.initials}
          </Banner>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Banner s={11} tk={0.06} c={C.inkDeep} numberOfLines={1}>
              {r.author}
            </Banner>
            {tag ? (
              <View style={{ backgroundColor: tagBg, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 6 }}>
                <Banner s={7.5} tk={0.08} c={tagFg}>
                  {tag}
                </Banner>
              </View>
            ) : null}
          </View>
          <Mono s={9} c={C.inkSoft} style={{ marginTop: 2 }}>
            {r.date}
          </Mono>
        </View>
        <Roundel size={36} bg={ss.bg} fg={ss.fg} text={fmt(r.score)} textSize={13} border={2} rot="-4deg" />
      </View>
      <Serif s={13.5} style={{ marginTop: 9, lineHeight: 20 }}>
        {r.text}
      </Serif>
      {r.dish ? (
        <View style={{ flexDirection: 'row', marginTop: 9 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
            {r.dishPhoto ? <Photo source={photo(r.dishPhoto)} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: C.inkBlack }} /> : null}
            <Mono s={9.5} c={C.inkDeep}>
              orders the {r.dish}
            </Mono>
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
        <Pressable onPress={onLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }} hitSlop={6}>
          <HeartIcon size={16} color={r.likedByMe ? C.ink400 : C.inkMuted} filled={r.likedByMe} />
          <Mono s={11} c={r.likedByMe ? C.ink400 : C.inkMuted}>
            {r.likes}
          </Mono>
        </Pressable>
      </View>
    </StickerView>
  );
}

function SealColumn({
  label,
  score,
  rot,
  overall,
  cuisineRank,
  cuisine,
  rightBorder,
}: {
  label: string;
  score: number;
  rot: string;
  overall: number | string;
  cuisineRank: number | string;
  cuisine: string;
  rightBorder?: boolean;
}) {
  const st = scoreStyle(score);
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 6, borderRightWidth: rightBorder ? 2 : 0, borderColor: C.inkBlack }}>
      <Banner s={9} tk={0.16} c={C.inkMuted}>
        {label}
      </Banner>
      <StickerView offset="sm" radius={999} style={{ transform: [{ rotate: rot }] }}>
        <Roundel size={62} bg={st.bg} fg={st.fg} text={fmt(score)} textSize={20} dashInset={6} />
      </StickerView>
      <Banner s={9} tk={0.1} c={C.inkDeep}>
        {verdictOf(score)}
      </Banner>
      <Mono s={9.5} c={C.inkMuted} style={{ textAlign: 'center', lineHeight: 14 }}>
        Nº {overall} overall{'\n'}Nº {cuisineRank} in {cuisine}
      </Mono>
    </View>
  );
}

function AppCard({
  dot,
  app,
  children,
  cta,
  ctaColor,
}: {
  dot: string;
  app: string;
  children: React.ReactNode;
  cta: string;
  ctaColor: string;
}) {
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, borderWidth: 1.5, borderColor: C.inkBlack }} />
        <Banner s={9} tk={0.16} c={dot}>
          {app}
        </Banner>
      </View>
      {children}
      <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)' }}>
        <Banner s={10} tk={0.12} c={ctaColor}>
          {cta}
        </Banner>
      </View>
    </StickerView>
  );
}

/** A live hashtag clip: poster thumbnail + play badge, title, and creator. */
function VideoThumb({ v, onPress }: { v: TrendingVideo; onPress: () => void }) {
  return (
    <StickerPressable
      offset="sm"
      onPress={onPress}
      style={{ width: 148, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}
    >
      <View style={{ width: '100%', height: 96, backgroundColor: C.ink700 }}>
        {v.thumb ? (
          <Image source={{ uri: v.thumb }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(216,80,26,0.92)', borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
            <PlayIcon size={14} color={C.paper0} />
          </View>
        </View>
        <View style={{ position: 'absolute', top: 5, left: 5, backgroundColor: C.inkBlack, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
          <Banner s={7} tk={0.1} c={C.paper0}>
            YouTube
          </Banner>
        </View>
      </View>
      <View style={{ padding: 8, gap: 3 }}>
        <Serif s={11} c={C.inkDeep} numberOfLines={2} style={{ lineHeight: 15 }}>
          {v.caption}
        </Serif>
        <Mono s={8} c={C.inkSoft} numberOfLines={1}>
          {v.creator}
        </Mono>
      </View>
    </StickerPressable>
  );
}

/** A small bordered info pill (rating, price, open-state, cuisine…). */
function InfoChip({ children, bg = C.paper0 }: { children: React.ReactNode; bg?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}>
      {children}
    </View>
  );
}

/** One "the draw" (pro) or "good to know" (caveat) line. */
function Point({ text, kind }: { text: string; kind: 'pro' | 'con' }) {
  const dotBg = kind === 'pro' ? C.stampGreen : C.sun400;
  const dotFg = kind === 'pro' ? C.paper0 : C.inkDeep;
  return (
    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: dotBg, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Banner s={9.5} c={dotFg}>
          {kind === 'pro' ? '+' : '!'}
        </Banner>
      </View>
      <Serif s={13} style={{ flex: 1, lineHeight: 18, color: C.inkDeep }}>
        {text}
      </Serif>
    </View>
  );
}

/** A contact / planning action (Call, Website, Directions, Menu). */
function ActionPill({ label, onPress, children }: { label: string; onPress: () => void; children?: React.ReactNode }) {
  return (
    <StickerPressable
      offset="sm"
      radius={999}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 9, paddingHorizontal: 13 }}
    >
      {children}
      <Banner s={9.5} tk={0.08} c={C.inkDeep}>
        {label}
      </Banner>
    </StickerPressable>
  );
}

/** Full weekly hours, today's row highlighted. Google lists Monday-first. */
function HoursList({ weekday }: { weekday: string[] }) {
  const todayIdx = (new Date().getDay() + 6) % 7; // JS Sun=0 → Google Mon=0
  return (
    <View style={{ gap: 2 }}>
      {weekday.map((line, i) => {
        const ci = line.indexOf(': ');
        const day = ci > 0 ? line.slice(0, ci) : line;
        const hrs = ci > 0 ? line.slice(ci + 2) : '';
        const today = i === todayIdx;
        return (
          <View
            key={i}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, backgroundColor: today ? C.paper100 : 'transparent', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 }}
          >
            <Mono s={10} c={today ? C.inkDeep : C.inkMuted}>
              {day}
              {today ? ' · today' : ''}
            </Mono>
            <Mono s={10} c={today ? C.inkDeep : C.inkMuted} style={{ textAlign: 'right' }}>
              {hrs}
            </Mono>
          </View>
        );
      })}
    </View>
  );
}

/** One real Google review (shown verbatim, with attribution). */
function GReviewCard({ r }: { r: GReview }) {
  return (
    <StickerView offset="sm" style={{ width: 260, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {r.photo ? (
          <Image source={{ uri: r.photo }} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.inkBlack }} />
        ) : (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack }} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={10} tk={0.04} c={C.inkDeep} numberOfLines={1}>
            {r.author}
          </Banner>
          <Mono s={8} c={C.inkSoft} style={{ marginTop: 2 }}>
            {r.relativeTime}
          </Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
          <Banner s={9} c={C.sun600}>
            ★ {r.rating.toFixed(1)}
          </Banner>
        </View>
      </View>
      <Serif s={12.5} style={{ marginTop: 9, lineHeight: 18 }}>
        {r.text}
      </Serif>
    </StickerView>
  );
}

/** One suggested order/plan, with its numbered steps and estimated total. */
function ComboCard({ combo }: { combo: Combo }) {
  return (
    <StickerView offset="sm" style={{ width: 228, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 11, backgroundColor: combo.best ? C.sun400 : C.paper50, borderBottomWidth: 2, borderColor: C.inkBlack }}>
        <Banner s={10} tk={0.1} c={C.inkDeep}>
          {combo.title}
        </Banner>
        {combo.best ? (
          <View style={{ backgroundColor: C.inkDeep, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Banner s={7.5} tk={0.1} c={C.paper0}>
              Optimal
            </Banner>
          </View>
        ) : (
          <Mono s={8.5} c={C.inkMuted}>{combo.forText}</Mono>
        )}
      </View>
      <View style={{ padding: 11, gap: 9 }}>
        <Serif s={11.5} c={C.inkMuted} style={{ lineHeight: 15 }}>
          {combo.blurb}
        </Serif>
        <View style={{ gap: 6 }}>
          {combo.items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.inkBlack, backgroundColor: combo.best ? C.sun400 : C.paper100, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Banner s={8} c={C.inkDeep}>
                  {i + 1}
                </Banner>
              </View>
              <Serif s={12.5} c={C.inkDeep} style={{ flex: 1, lineHeight: 16 }}>
                {it.label}
              </Serif>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)', paddingTop: 8 }}>
          <Mono s={9} c={C.inkSoft}>
            Est. · {combo.forText}
          </Mono>
          <SerifDisplay s={18} c={C.inkDeep}>
            {combo.priceText}
          </SerifDisplay>
        </View>
      </View>
    </StickerView>
  );
}

/** One row of the value ladder: a quality-per-dollar bar for a peer venue. */
function ValueRowView({ row, rank, maxV, onOpen }: { row: ValueRow; rank: number; maxV: number; onOpen: () => void }) {
  const p = row.place;
  const w = Math.max(8, Math.round((row.value / maxV) * 100));
  return (
    <Pressable
      onPress={onOpen}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: row.isThis ? C.sun400 : C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 8, paddingHorizontal: 10 }}
    >
      <Display s={14} c={C.inkSoft}>
        {rank}
      </Display>
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={13} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 15 }}>
          {p.name}
          {row.isThis ? ' · here' : ''}
        </SerifDisplay>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ flex: 1, height: 7, backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${w}%`, height: '100%', backgroundColor: row.isThis ? C.inkDeep : C.stampGreen }} />
          </View>
          <Mono s={8.5} c={C.inkMuted}>
            {p.price}
          </Mono>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', width: 44 }}>
        <Banner s={9.5} c={C.sun600}>
          {typeof p.rating === 'number' ? `★ ${p.rating.toFixed(1)}` : typeof p.acclaim === 'number' ? `◆ ${p.acclaim}` : '—'}
        </Banner>
        {rank === 1 ? (
          <Mono s={7.5} c={C.stampGreen} style={{ marginTop: 2 }}>
            best value
          </Mono>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A labelled line inside the dark "From the guide" card. */
function GuideRow({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Banner s={8} tk={0.14} c={C.sun300}>
        {label}
      </Banner>
      <Serif s={12.5} c={C.paper0} style={{ lineHeight: 17 }}>
        {text}
      </Serif>
    </View>
  );
}

export function PlaceDetail() {
  const insets = useSafeAreaInsets();
  const activePlaceId = useStore((s) => s.activePlaceId);
  const closePlace = useStore((s) => s.closePlace);
  const openPlace = useStore((s) => s.openPlace);
  const startRank = useStore((s) => s.startRank);
  const go = useStore((s) => s.go);
  const addPhoto = useStore((s) => s.addPhoto);
  const toggleWant = useStore((s) => s.toggleWant);
  const ranked = useStore((s) => s.ranked);
  const wantIds = useStore((s) => s.wantIds);
  const saved = useStore((s) => s.saved);
  const userPhotos = useStore((s) => s.userPhotos);
  const nearbyById = useStore((s) => s.nearbyById);
  const nearbyList = useStore((s) => s.nearby);
  const city = useStore((s) => s.city);
  const userReviews = useStore((s) => s.userReviews);
  const reviewLikes = useStore((s) => s.reviewLikes);
  const reviewSort = useStore((s) => s.reviewSort);
  const reviewFriendsOnly = useStore((s) => s.reviewFriendsOnly);
  const setReviewSort = useStore((s) => s.setReviewSort);
  const setReviewFriendsOnly = useStore((s) => s.setReviewFriendsOnly);
  const toggleReviewLike = useStore((s) => s.toggleReviewLike);
  const openReviewComposer = useStore((s) => s.openReviewComposer);
  const sharedReviews = useStore((s) => s.sharedReviews);
  const loadSharedReviews = useStore((s) => s.loadSharedReviews);
  const placeVideosMap = useStore((s) => s.placeVideos);
  const placeVideosStatusMap = useStore((s) => s.placeVideosStatus);
  const loadPlaceVideos = useStore((s) => s.loadPlaceVideos);
  const openVideo = useStore((s) => s.openVideo);
  const tastes = useStore((s) => s.tastes);
  const placeDetailsMap = useStore((s) => s.placeDetails);
  const placeDetailsStatusMap = useStore((s) => s.placeDetailsStatus);
  const loadPlaceDetails = useStore((s) => s.loadPlaceDetails);
  const livePhotosMap = useStore((s) => s.livePhotos);
  const openChef = useStore((s) => s.openChef);
  const t = useT();

  // Pull other testers' reviews for this place from the shared backend (if on).
  useEffect(() => {
    if (activePlaceId) loadSharedReviews(activePlaceId);
  }, [activePlaceId, loadSharedReviews]);

  // Pull real hashtag videos for this place (YouTube; no-op if key/API off).
  useEffect(() => {
    if (activePlaceId) loadPlaceVideos(activePlaceId);
  }, [activePlaceId, loadPlaceVideos]);

  // Pull rich "before you go" details (live Google Place Details; web only).
  useEffect(() => {
    if (activePlaceId) loadPlaceDetails(activePlaceId);
  }, [activePlaceId, loadPlaceDetails]);

  if (!activePlaceId) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;
  const base = resolvePlace(activePlaceId, nearbyById);
  if (!base) return <View style={{ flex: 1, backgroundColor: C.paper50 }} />;
  const rIdx = ranked.findIndex((r) => r.id === activePlaceId);
  const rr = rIdx < 0 ? null : { idx: rIdx, item: ranked[rIdx] };
  const been = !!rr;
  const ss = been ? scoreStyle(rr!.item.score!) : { bg: C.paper0, fg: C.inkDeep };
  const wanted = wantIds.includes(activePlaceId) || !!saved[activePlaceId];

  // Seed places carry critic/people scores; freshly-discovered (OSM) ones don't.
  const isRated = base.critic != null && base.people != null;
  const reviews = reviewsFor(
    activePlaceId,
    userReviews,
    reviewLikes,
    { friendsOnly: reviewFriendsOnly, sort: reviewSort },
    sharedReviews,
  );
  const topDish = popularDishFor(activePlaceId, userReviews, sharedReviews);
  const cu = base.cuisine;
  const mapsUrl =
    base.lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${base.lat},${base.lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.name + ' ' + base.hood)}`;

  // Real Google Maps photos: resolved live for curated venues (livePhotos), or
  // carried on the place for Google-sourced ones. Shown with attribution.
  const live = livePhotosMap[activePlaceId];
  const heroUrl = live?.photoUrl || base.photoUrl;
  const heroAttr = live?.photoAttr || base.photoAttr;
  const liveUrls = live?.photoUrls?.length
    ? live.photoUrls
    : live?.photoUrl
      ? [live.photoUrl]
      : base.photoUrls?.length
        ? base.photoUrls
        : base.photoUrl
          ? [base.photoUrl]
          : [];

  const off = activePlaceId.length % PHOTO_POOL.length;
  const stockFill = [base.photo, PHOTO_POOL[off], PHOTO_POOL[(off + 3) % PHOTO_POOL.length]];
  // Prefer the venue's real Google photos; fall back to stock only to fill out
  // the grid when a place has fewer than three.
  const realPhotos = liveUrls;
  const seedTiles = Array.from({ length: 3 }, (_, i) =>
    i < realPhotos.length ? { url: realPhotos[i], mine: false } : { src: stockFill[i], mine: false }
  );
  const mine = userPhotos[activePlaceId] || [];
  const gallery: { src?: string; url?: string; mine: boolean }[] = [
    ...seedTiles,
    ...mine.map((src) => ({ src, mine: true })),
  ];

  // Hashtag videos: the venue's tag, its live clips, and platform feed links.
  const tag = hashtagOf(base);
  const links = hashtagLinks(tag);
  const videos = placeVideosMap[activePlaceId] || [];
  const videosStatus = placeVideosStatusMap[activePlaceId] || 'idle';

  // Rich "before you go" details + honest highlights + taste fit.
  const details = placeDetailsMap[activePlaceId];
  const detailsStatus = placeDetailsStatusMap[activePlaceId] || 'idle';
  const palate = computePalate(ranked, tastes, userReviews);
  const fit = fitFor(base, palate, tastes); // 0..1 | null
  const { draws, knows } = drawAndKnow(base, details, fit);
  const gReviews = details?.googleReviews || [];
  const gRating = base.rating ?? details?.rating;
  const gReviewCount = base.reviews ?? details?.reviews;
  const openNow = details?.openNow ?? (/open/i.test(base.openInfo || '') ? true : /closed/i.test(base.openInfo || '') ? false : undefined);
  const phone = details?.phone || base.phone;
  const website = details?.website || base.website;
  const dirUrl =
    base.lat != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${base.lat},${base.lon}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(base.name + ' ' + base.hood)}`;

  // What to order (estimated combos / optimal plan) + bang-for-buck comparison.
  const combos = combosFor(base, topDish?.name, city);
  const curCode = currencyCode(city);
  const peerComp = peerComparison(base, nearbyList);
  const valueMax = peerComp ? peerComp.rows[0].value || 1 : 1;
  const topRows = peerComp ? peerComp.rows.slice(0, 3) : [];
  const valueRows =
    peerComp && !topRows.some((r) => r.isThis) ? [...topRows, peerComp.rows[peerComp.rankOfThis - 1]] : topRows;
  const valueVerdict = peerComp
    ? peerComp.verdict.startsWith('Great')
      ? { bg: C.stampGreen, fg: C.paper0 }
      : peerComp.verdict.startsWith('Fair')
        ? { bg: C.sun400, fg: C.inkDeep }
        : { bg: C.paper100, fg: C.inkMuted }
    : { bg: C.paper0, fg: C.inkDeep };

  // Curated "Carte" guide fields (CDMX dataset): real dishes, awards, chef, etc.
  const isCarte = base.source === 'carte';
  const awards = base.awards || '';
  let guideBadge = '';
  if (/estrella/i.test(awards)) {
    const m = /(\d)\s*estrella/i.exec(awards);
    guideBadge = 'Michelin ' + (m ? '★'.repeat(Math.min(3, +m[1])) : '★');
  } else if (/bib gourmand/i.test(awards)) guideBadge = 'Bib Gourmand';
  else if (/michelin/i.test(awards)) guideBadge = 'Michelin';
  else if (/50 best/i.test(awards)) guideBadge = "50 Best";
  const momentLabel =
    base.moment === 'Apertura 2026'
      ? 'New · 2026'
      : base.moment === 'En ascenso'
        ? 'Rising'
        : base.moment === 'Trayectoria'
          ? 'Institution'
          : '';
  const instaUrl = base.instagram ? `https://instagram.com/${base.instagram.replace(/^@/, '')}` : undefined;
  // The chef (or team) behind this place — links to a profile that gathers all
  // of their restaurants when the guide credits them at more than one.
  const chef = chefForPlace(base);
  const chefPlaceCount = chef ? chef.placeIds.length : 0;

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      {/* hero — real Google photo when we have one, else a distinct generated cover */}
      <View style={{ position: 'relative' }}>
        <PlaceCover
          place={base}
          photoUrl={heroUrl}
          style={{ width: '100%', height: 226, borderBottomWidth: 2.5, borderColor: C.inkBlack }}
          crestSize={92}
          eyebrow
        />
        {heroUrl ? (
          <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(27,16,4,0.6)', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
            <Mono s={7.5} c={C.paper0} numberOfLines={1}>
              {heroAttr ? `Photo: ${heroAttr}` : 'Photo · Google Maps'}
            </Mono>
          </View>
        ) : null}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={closePlace} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={18} c={C.ink400}>
                ←
              </Display>
            </Pressable>
          </StickerView>
        </View>
        {/* over a real photo, stamp the venue's brand monogram (the generated cover already carries its crest) */}
        {heroUrl ? (
          <View style={{ position: 'absolute', right: 14, top: insets.top + 8 }}>
            <StickerView offset="sm" radius={999}>
              <Monogram name={base.name} size={46} rot="-6deg" />
            </StickerView>
          </View>
        ) : null}
        {been ? (
          <View style={{ position: 'absolute', right: 16, bottom: -24, transform: [{ rotate: '-7deg' }] }}>
            <StickerView offset="lg" radius={999}>
              <Roundel size={68} bg={ss.bg} fg={ss.fg} text={fmt(rr!.item.score!)} textSize={24} border={3} dashInset={7} />
            </StickerView>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Display s={28} c={C.inkDeep} style={{ maxWidth: '78%', lineHeight: 28 }}>
          {base.name}
        </Display>
        <Mono s={11} c={C.inkMuted} style={{ marginTop: 7 }}>
          {metaOf(base)}
        </Mono>
        {been ? (
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <StickerView offset="sm" radius={999} style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 }}>
              <Banner s={10} tk={0.1} c={C.inkDeep}>
                Nº {rr!.idx + 1} in your log
              </Banner>
            </StickerView>
          </View>
        ) : null}
        <Serif s={14.5} style={{ marginTop: 14, lineHeight: 22 }}>
          {base.blurb}
        </Serif>

        {/* at-a-glance — the quick read before anything else */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
          {gRating != null ? (
            <InfoChip>
              <Banner s={10} c={C.sun600}>
                ★ {gRating.toFixed(1)}
              </Banner>
              {gReviewCount != null ? (
                <Mono s={9} c={C.inkMuted}>
                  {gReviewCount.toLocaleString()}
                </Mono>
              ) : null}
            </InfoChip>
          ) : null}
          {isCarte && guideBadge ? (
            <InfoChip bg={C.inkDeep}>
              <Banner s={9.5} tk={0.06} c={C.paper0}>
                {guideBadge}
              </Banner>
            </InfoChip>
          ) : isCarte && base.acclaim != null ? (
            <InfoChip>
              <Banner s={9.5} c={C.sun600}>
                Acclaim {base.acclaim}
              </Banner>
            </InfoChip>
          ) : null}
          <InfoChip>
            <Mono s={10} c={C.inkDeep}>
              {priceLabel(base, details)}
            </Mono>
          </InfoChip>
          {openNow !== undefined ? (
            <InfoChip bg={openNow ? C.stampGreen : C.paper0}>
              <Banner s={9.5} tk={0.06} c={openNow ? C.paper0 : C.inkMuted}>
                {openNow ? 'Open now' : 'Closed now'}
              </Banner>
            </InfoChip>
          ) : null}
          {base.cuisine && base.cuisine !== 'Restaurant' ? (
            <InfoChip>
              <Mono s={10} c={C.inkDeep}>
                {base.category || base.cuisine}
              </Mono>
            </InfoChip>
          ) : null}
          {isCarte && momentLabel ? (
            <InfoChip bg={base.moment === 'Apertura 2026' ? C.stampGreen : C.paper0}>
              <Banner s={9.5} tk={0.06} c={base.moment === 'Apertura 2026' ? C.paper0 : C.inkMuted}>
                {momentLabel}
              </Banner>
            </InfoChip>
          ) : null}
          {detailsStatus === 'loading' ? (
            <InfoChip>
              <ActivityIndicator size="small" color={C.ink400} />
              <Mono s={9} c={C.inkMuted}>
                more…
              </Mono>
            </InfoChip>
          ) : null}
        </View>

        {/* the lowdown — Google's own words about the place (when available) */}
        {details?.summary ? (
          <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 3, borderRadius: 2, backgroundColor: C.ink400 }} />
            <View style={{ flex: 1 }}>
              <Banner s={8.5} tk={0.14} c={C.inkMuted}>
                The lowdown · Google
              </Banner>
              <Serif s={13.5} style={{ marginTop: 4, lineHeight: 20, color: C.inkDeep }}>
                {details.summary}
              </Serif>
            </View>
          </View>
        ) : null}

        {/* taste match — how it fits the signed-in foodie's palate */}
        {fit != null ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Banner s={10} tk={0.14} c={C.inkMuted}>
                Your taste match
              </Banner>
              <Banner s={13} c={fit >= 0.66 ? C.stampGreen : fit >= 0.45 ? C.sun600 : C.inkMuted}>
                {Math.round(fit * 100)}%
              </Banner>
            </View>
            <View style={{ height: 14, borderRadius: 999, backgroundColor: C.paper100, borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(4, Math.round(fit * 100))}%`, height: '100%', backgroundColor: fit >= 0.66 ? C.stampGreen : C.ink400 }} />
            </View>
            <Mono s={9} c={C.inkSoft} style={{ marginTop: 5, lineHeight: 14 }}>
              {fit >= 0.66
                ? 'Strongly matches your palate'
                : fit >= 0.45
                  ? 'A decent fit for your taste'
                  : 'Outside your usual lane — could be a fun stretch'}
            </Mono>
          </View>
        ) : null}

        {/* from the guide — curated awards, chef, occasion & insider tip (Carte dataset) */}
        {isCarte && (base.awards || base.chef || base.occasion || base.tip || base.why) ? (
          <StickerView offset="lg" style={{ marginTop: 16, backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 13, borderBottomWidth: 2, borderColor: C.inkBlack }}>
              <Banner s={10} tk={0.14} c={C.sun300}>
                From the guide
              </Banner>
              {base.recognition ? (
                <Mono s={8.5} c={C.paper0}>
                  {base.recognition}
                </Mono>
              ) : null}
            </View>
            <View style={{ padding: 14, gap: 11 }}>
              {base.awards ? (
                <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sun400, marginTop: 5 }} />
                  <Serif s={13} c={C.paper0} style={{ flex: 1, lineHeight: 18 }}>
                    {base.awards}
                  </Serif>
                </View>
              ) : null}
              {chef ? (
                <Pressable
                  onPress={() => openChef(chef.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 2, borderColor: C.sun400, borderRadius: 12, padding: 9, backgroundColor: 'rgba(251,245,229,0.06)' }}
                >
                  <Monogram name={chef.name} size={40} fg={C.paper0} rot="-4deg" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Banner s={8} tk={0.14} c={C.sun300}>
                      Chef / team
                    </Banner>
                    <Serif s={13.5} c={C.paper0} numberOfLines={1} style={{ marginTop: 2 }}>
                      {chef.name}
                    </Serif>
                    <Mono s={8.5} c={C.ink100} style={{ marginTop: 2 }}>
                      {chefPlaceCount > 1 ? `Behind ${chefPlaceCount} restaurants · see profile` : 'See chef profile'}
                    </Mono>
                  </View>
                  <Display s={18} c={C.sun300}>
                    →
                  </Display>
                </Pressable>
              ) : base.chef ? (
                <GuideRow label="Chef / team" text={base.chef} />
              ) : null}
              {base.why ? <GuideRow label="Why it stands out now" text={base.why} /> : null}
              {base.occasion ? <GuideRow label="Ideal for" text={base.occasion} /> : null}
              {base.tip ? <GuideRow label="Insider tip" text={base.tip} /> : null}
            </View>
          </StickerView>
        ) : null}

        {/* rankings panel — dual verdict for rated places, "be the first" for fresh finds */}
        <View style={{ marginTop: 16 }}>
          {isRated ? (
            <StickerView offset="lg" style={{ borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 13, borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.ink700 }}>
                <Banner s={10} tk={0.14} c={C.paper0}>
                  The rankings
                </Banner>
                <Mono s={9.5} c={C.sun300}>
                  of {RANK.total} places
                </Mono>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <SealColumn label="Critics' ranking" score={base.critic || 0} rot="-5deg" overall={RANK.critO[base.id] || '—'} cuisineRank={RANK.critC[base.id] || '—'} cuisine={cu} rightBorder />
                <SealColumn label="People's ranking" score={base.people || 0} rot="4deg" overall={RANK.popO[base.id] || '—'} cuisineRank={RANK.popC[base.id] || '—'} cuisine={cu} />
              </View>
            </StickerView>
          ) : (
            <StickerView offset="lg" style={{ borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper0, padding: 16, alignItems: 'center', gap: 8 }}>
              <View style={{ transform: [{ rotate: '-4deg' }] }}>
                <Roundel size={58} bg={C.paper100} fg={C.inkSoft} text="?" textSize={26} dashInset={6} />
              </View>
              <Banner s={11} tk={0.12} c={C.inkDeep}>
                No verdict yet
              </Banner>
              <Serif s={13} style={{ textAlign: 'center', color: C.inkMuted, lineHeight: 19 }}>
                Fresh off the map — no Critics or People score yet. Be the first of us to rank it.
              </Serif>
              {base.source === 'google' && base.rating != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: C.paper100, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={10} tk={0.06} c={C.sun600}>
                    ★ {base.rating.toFixed(1)}
                  </Banner>
                  <Mono s={9} c={C.inkMuted}>
                    {base.reviews ? `${base.reviews.toLocaleString()} Google reviews` : 'on Google'}
                  </Mono>
                </View>
              ) : null}
            </StickerView>
          )}
        </View>

        {/* the draw / good to know — honest highlights derived from real signals */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampGreen }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              The draw
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
          </View>
          <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 13, gap: 10 }}>
            {draws.map((d, i) => (
              <Point key={i} text={d} kind="pro" />
            ))}
          </StickerView>
          {knows.length ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, marginBottom: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sun400 }} />
                <Banner s={10} tk={0.16} c={C.inkMuted}>
                  Good to know
                </Banner>
                <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
              </View>
              <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 13, gap: 10 }}>
                {knows.map((k, i) => (
                  <Point key={i} text={k} kind="con" />
                ))}
              </StickerView>
            </>
          ) : null}
        </View>

        {/* table favourite — the most-named dish across everyone's reviews */}
        {topDish ? (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                The table favourite
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            </View>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', overflow: 'hidden' }}>
              <View>
                <Photo source={photo(topDish.photo)} style={{ width: 118, height: 118, borderRightWidth: 2.5, borderColor: C.inkBlack }} />
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, transform: [{ rotate: '-5deg' }] }}>
                  <Banner s={8} tk={0.08} c={C.inkDeep}>
                    Nº 1 order
                  </Banner>
                </View>
              </View>
              <View style={{ flex: 1, padding: 12, justifyContent: 'center', gap: 6 }}>
                <SerifDisplay s={19} c={C.inkDeep} style={{ lineHeight: 21 }}>
                  {topDish.name}
                </SerifDisplay>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Roundel size={24} bg={scoreStyle(topDish.score).bg} fg={scoreStyle(topDish.score).fg} text={fmt(topDish.score)} textSize={9} border={1.5} rot="-4deg" />
                  <Mono s={9.5} c={C.inkMuted}>
                    {topDish.count === 1 ? 'named by 1 diner' : `named by ${topDish.count} diners`}
                  </Mono>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {topDish.fans.map((f, i) => (
                    <View
                      key={i}
                      style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: col(f.color), borderWidth: 1.5, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center', marginLeft: i === 0 ? 0 : -7 }}
                    >
                      <Banner s={7.5} c={C.paper0}>
                        {f.initials}
                      </Banner>
                    </View>
                  ))}
                  <Mono s={9} c={C.inkSoft} style={{ marginLeft: 8 }}>
                    swear by it
                  </Mono>
                </View>
              </View>
            </StickerView>
          </View>
        ) : null}

        {/* what to order — real guide picks (Carte) or estimated combos (live) */}
        {isCarte && base.dishes && base.dishes.length ? (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                What to order
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
              <Mono s={9} c={C.inkSoft}>
                from the guide
              </Mono>
            </View>
            <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 14, gap: 11 }}>
              {base.dishes.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.inkBlack, backgroundColor: C.sun400, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Banner s={8.5} c={C.inkDeep}>
                      {i + 1}
                    </Banner>
                  </View>
                  <Serif s={13.5} c={C.inkDeep} style={{ flex: 1, lineHeight: 18 }}>
                    {d}
                  </Serif>
                </View>
              ))}
              {base.ticket ? (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)', paddingTop: 10, marginTop: 2 }}>
                  <Mono s={9.5} c={C.inkSoft}>
                    Per person
                  </Mono>
                  <SerifDisplay s={17} c={C.inkDeep}>
                    {base.ticketMid ? `≈ $${base.ticketMid.toLocaleString()} MXN` : base.ticket}
                  </SerifDisplay>
                </View>
              ) : null}
            </StickerView>
            <Mono s={8} c={C.inkSoft} style={{ marginTop: 6, lineHeight: 12 }}>
              The guide's picks{base.ticket ? ` · ${base.ticket} MXN per person` : ''}.
            </Mono>
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                What to order
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
              <Mono s={9} c={C.inkSoft}>
                est. {curCode}
              </Mono>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
              {combos.map((c) => (
                <ComboCard key={c.key} combo={c} />
              ))}
            </ScrollView>
            <Mono s={8} c={C.inkSoft} style={{ marginTop: 6, lineHeight: 12 }}>
              Suggested plans — prices are rough estimates from the venue's price tier, not a live menu.
            </Mono>
          </View>
        )}

        {/* bang for your buck — value vs. same-niche, similar-priced neighbours */}
        {peerComp ? (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampGreen }} />
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                Bang for your buck
              </Banner>
              <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
            </View>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 13, gap: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ backgroundColor: valueVerdict.bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
                  <Banner s={9.5} tk={0.06} c={valueVerdict.fg}>
                    {peerComp.verdict}
                  </Banner>
                </View>
                <Mono s={9} c={C.inkMuted} style={{ flexShrink: 1, textAlign: 'right' }}>
                  Nº {peerComp.rankOfThis} of {peerComp.total} · {base.cuisine} near {base.price}
                </Mono>
              </View>
              <View style={{ gap: 8 }}>
                {valueRows.map((row) => (
                  <ValueRowView key={row.place.id} row={row} rank={peerComp.rows.indexOf(row) + 1} maxV={valueMax} onOpen={() => openPlace(row.place.id)} />
                ))}
              </View>
              {peerComp.cheaperBetter ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderTopWidth: 1, borderColor: 'rgba(42,26,6,0.2)', paddingTop: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampGreen, marginTop: 5 }} />
                  <Serif s={12.5} c={C.inkDeep} style={{ flex: 1, lineHeight: 17 }}>
                    Cheaper &amp; just as loved: {peerComp.cheaperBetter.name} ({peerComp.cheaperBetter.price}
                    {typeof peerComp.cheaperBetter.rating === 'number' ? ` · ★${peerComp.cheaperBetter.rating.toFixed(1)}` : ''}).
                  </Serif>
                </View>
              ) : null}
              <Mono s={8} c={C.inkSoft} style={{ lineHeight: 12 }}>
                Value = quality ÷ price tier, across loaded {base.cuisine} spots near this price.
              </Mono>
            </StickerView>
          </View>
        ) : null}

        {/* google maps card — opens the real location */}
        <View style={{ marginTop: 18 }}>
          <Pressable onPress={() => Linking.openURL(mapsUrl)}>
            <AppCard dot={C.stampGreen} app="Google Maps" cta="Open in Google Maps →" ctaColor={C.stampGreen}>
              <View style={{ paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.greenFg, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] }}>
                  <Display s={18} c={C.greenFg}>
                    ↓
                  </Display>
                </View>
                <View style={{ flex: 1 }}>
                  <Serif s={13.5} c={C.inkDeep}>
                    {base.addr || base.name}
                  </Serif>
                  <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                    {base.hood}
                    {base.openInfo ? ` · ${base.openInfo}` : ''}
                  </Mono>
                </View>
              </View>
            </AppCard>
          </Pressable>
        </View>

        {/* plan your visit — full hours + one-tap contact / directions */}
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              Plan your visit
            </Banner>
            <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
          </View>
          <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 13, gap: 12 }}>
            {details?.weekdayHours ? (
              <View>
                <Banner s={8.5} tk={0.14} c={C.inkMuted} style={{ marginBottom: 6 }}>
                  Hours
                </Banner>
                <HoursList weekday={details.weekdayHours} />
              </View>
            ) : detailsStatus === 'loading' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={C.ink400} />
                <Mono s={10} c={C.inkMuted}>
                  Loading hours &amp; contact…
                </Mono>
              </View>
            ) : base.openInfo ? (
              <Mono s={10.5} c={C.inkDeep}>
                {base.openInfo}
              </Mono>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {phone ? (
                <ActionPill label={phone} onPress={() => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)} />
              ) : null}
              {website ? (
                <ActionPill label="Website" onPress={() => Linking.openURL(website)}>
                  <GlobeMark size={13} color={C.ink400} />
                </ActionPill>
              ) : null}
              {instaUrl ? <ActionPill label={base.instagram || 'Instagram'} onPress={() => Linking.openURL(instaUrl)} /> : null}
              <ActionPill label="Directions" onPress={() => Linking.openURL(dirUrl)}>
                <MapIcon size={13} color={C.ink400} />
              </ActionPill>
            </View>
          </StickerView>
        </View>

        {/* photo gallery */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted}>
            Photo gallery
          </Banner>
          <Mono s={9.5} c={C.inkSoft}>
            {gallery.length} shots · community
          </Mono>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pressable
            onPress={() => addPhoto(activePlaceId)}
            style={{ width: '31.6%', aspectRatio: 1, borderWidth: 2, borderColor: C.inkBlack, borderStyle: 'dashed', backgroundColor: C.paper100, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <PlusIcon size={20} color={C.ink400} sw={2} />
            <Banner s={8} tk={0.08} c={C.ink400}>
              Add yours
            </Banner>
          </Pressable>
          {gallery.map((g, i) => (
            <View key={i} style={{ width: '31.6%', aspectRatio: 1, borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden' }}>
              <Photo source={g.url ? { uri: g.url } : photo(g.src || base.photo)} style={{ width: '100%', height: '100%' }} />
              {g.mine ? (
                <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: C.sun400, borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 6 }}>
                  <Banner s={7} tk={0.1} c={C.inkDeep}>
                    You
                  </Banner>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* on the reel — real videos found by this restaurant's hashtag */}
        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Banner s={10} tk={0.16} c={C.inkMuted}>
              {t('reel.section')}
            </Banner>
            <StickerView offset="sm" radius={999} style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
              <Banner s={9.5} tk={0.04} c={C.inkDeep}>
                #{tag}
              </Banner>
            </StickerView>
          </View>

          {videosStatus === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <ActivityIndicator size="small" color={C.ink400} />
              <Mono s={10} c={C.inkMuted}>
                {t('reel.finding')}
              </Mono>
            </View>
          ) : null}

          {videos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
              {videos.map((v) => {
                const url = embedUrlFor(v);
                return <VideoThumb key={v.id} v={v} onPress={() => url && openVideo(url + '&autoplay=1')} />;
              })}
            </ScrollView>
          ) : videosStatus === 'empty' || videosStatus === 'idle' || !youtubeEnabled() ? (
            <Mono s={11} c={C.inkMuted} style={{ lineHeight: 17 }}>
              {t('reel.none')}
            </Mono>
          ) : null}

          {/* live hashtag feeds on each platform (always available) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {TAG_PLATFORMS.map((p) => (
              <StickerPressable
                key={p}
                offset="sm"
                radius={999}
                onPress={() => Linking.openURL(links[p])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 8, paddingHorizontal: 13 }}
              >
                <PlayIcon size={11} color={C.ink400} />
                <Banner s={9.5} tk={0.08} c={C.inkDeep}>
                  {PLATFORM_LABEL[p]}
                </Banner>
              </StickerPressable>
            ))}
          </View>
        </View>

        {/* reviews — public, Letterboxd-style */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
          <Banner s={10} tk={0.16} c={C.inkMuted}>
            Reviews
          </Banner>
          <Mono s={9.5} c={C.inkSoft}>
            {reviews.length} · public
          </Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TogglePill on={!reviewFriendsOnly} label="Everyone" onPress={() => setReviewFriendsOnly(false)} />
          <TogglePill on={reviewFriendsOnly} label="Friends" onPress={() => setReviewFriendsOnly(true)} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setReviewSort(reviewSort === 'popular' ? 'recent' : 'popular')} hitSlop={6}>
            <Mono s={9.5} c={C.ink400}>
              {reviewSort === 'popular' ? 'Popular ⇅' : 'Recent ⇅'}
            </Mono>
          </Pressable>
        </View>
        {reviews.length ? (
          <View style={{ gap: 10 }}>
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} onLike={() => toggleReviewLike(r.id)} />
            ))}
          </View>
        ) : (
          <View style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderStyle: 'dashed', paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}>
            <Serif s={13} style={{ color: C.inkMuted, textAlign: 'center' }}>
              {reviewFriendsOnly ? 'None of your friends have reviewed this yet.' : 'No reviews yet. Be the first to write one.'}
            </Serif>
          </View>
        )}
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => openReviewComposer(activePlaceId)}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 12 }}
        >
          <PlusIcon size={15} color={C.inkDeep} sw={2.6} />
          <Banner s={12} tk={0.1} c={C.inkDeep}>
            Write a review
          </Banner>
        </StickerPressable>

        {/* fresh from google — real Google reviews, shown verbatim with attribution */}
        {gReviews.length ? (
          <View style={{ marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <Banner s={10} tk={0.16} c={C.inkMuted}>
                From Google
              </Banner>
              <Mono s={9.5} c={C.inkSoft}>
                {gRating != null
                  ? `★ ${gRating.toFixed(1)}${gReviewCount != null ? ` · ${gReviewCount.toLocaleString()}` : ''}`
                  : 'reviews'}
              </Mono>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
              {gReviews.map((r, i) => (
                <GReviewCard key={i} r={r} />
              ))}
            </ScrollView>
            <Mono s={8} c={C.inkSoft} style={{ marginTop: 6 }}>
              Reviews from Google · shown as written
            </Mono>
          </View>
        ) : null}

        {/* resy card */}
        <View style={{ marginTop: 18 }}>
          <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400, borderWidth: 1.5, borderColor: C.inkBlack }} />
              <Banner s={9} tk={0.16} c={C.ink400}>
                Resy
              </Banner>
            </View>
            <View style={{ paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View>
                <Serif s={13.5} c={C.inkDeep}>
                  Tonight · party of 2
                </Serif>
                <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                  7:30, 8:00, 9:15 open
                </Mono>
              </View>
              <Banner s={10} tk={0.1} c={C.ink400}>
                Reserve →
              </Banner>
            </View>
          </StickerView>
        </View>
      </ScrollView>

      {/* footer */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper100 }}>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => toggleWant(activePlaceId)}
          style={{ width: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: wanted ? C.stampGreen : C.paper0 }}
        >
          <BookmarkIcon size={20} color={wanted ? C.greenFg : C.inkDeep} filled={wanted} />
        </StickerPressable>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => (been ? go('log') : startRank(activePlaceId))}
          style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 14, backgroundColor: been ? C.stampGreen : C.ink400 }}
        >
          <Banner s={14} tk={0.1} c={C.paper0}>
            {been ? `Ranked ✓ · Nº ${rr!.idx + 1}` : 'Rank it'}
          </Banner>
        </StickerPressable>
      </View>
    </ScreenIn>
  );
}
