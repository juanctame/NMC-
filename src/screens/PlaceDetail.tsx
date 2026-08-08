/**
 * Place detail — hero, dual Rotten-Tomatoes rankings (Critics + People, ranked
 * independently overall and per-cuisine), a Google Maps card, community photo
 * gallery with upload, friends who've been, a reservation card, and want/rank
 * CTAs.
 */
import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, resolvePlace, reviewsFor, popularDishFor, type ScoredReview } from '../store/useStore';
import { RANK } from '../store/data';
import { scoreStyle, verdictOf, fmt, metaOf } from '../store/helpers';
import { C, col } from '../theme/tokens';
import { photo, PHOTO_POOL } from '../assets';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { Roundel } from '../components/Roundel';
import { PlusIcon, BookmarkIcon, HeartIcon } from '../components/icons';
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

export function PlaceDetail() {
  const insets = useSafeAreaInsets();
  const activePlaceId = useStore((s) => s.activePlaceId);
  const closePlace = useStore((s) => s.closePlace);
  const startRank = useStore((s) => s.startRank);
  const go = useStore((s) => s.go);
  const addPhoto = useStore((s) => s.addPhoto);
  const toggleWant = useStore((s) => s.toggleWant);
  const ranked = useStore((s) => s.ranked);
  const wantIds = useStore((s) => s.wantIds);
  const saved = useStore((s) => s.saved);
  const userPhotos = useStore((s) => s.userPhotos);
  const nearbyById = useStore((s) => s.nearbyById);
  const userReviews = useStore((s) => s.userReviews);
  const reviewLikes = useStore((s) => s.reviewLikes);
  const reviewSort = useStore((s) => s.reviewSort);
  const reviewFriendsOnly = useStore((s) => s.reviewFriendsOnly);
  const setReviewSort = useStore((s) => s.setReviewSort);
  const setReviewFriendsOnly = useStore((s) => s.setReviewFriendsOnly);
  const toggleReviewLike = useStore((s) => s.toggleReviewLike);
  const openReviewComposer = useStore((s) => s.openReviewComposer);

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
  const reviews = reviewsFor(activePlaceId, userReviews, reviewLikes, {
    friendsOnly: reviewFriendsOnly,
    sort: reviewSort,
  });
  const topDish = popularDishFor(activePlaceId, userReviews);
  const cu = base.cuisine;
  const mapsUrl =
    base.lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${base.lat},${base.lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.name + ' ' + base.hood)}`;

  const off = activePlaceId.length % PHOTO_POOL.length;
  const seedG = [base.photo, PHOTO_POOL[off], PHOTO_POOL[(off + 3) % PHOTO_POOL.length]];
  const mine = userPhotos[activePlaceId] || [];
  const gallery = [
    ...seedG.map((src) => ({ src, mine: false })),
    ...mine.map((src) => ({ src, mine: true })),
  ];

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      {/* hero */}
      <View style={{ position: 'relative' }}>
        <Photo source={photo(base.photo)} style={{ width: '100%', height: 226, borderBottomWidth: 2.5, borderColor: C.inkBlack }} />
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={closePlace} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={18} c={C.ink400}>
                ←
              </Display>
            </Pressable>
          </StickerView>
        </View>
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
              <Photo source={photo(g.src)} style={{ width: '100%', height: '100%' }} />
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
