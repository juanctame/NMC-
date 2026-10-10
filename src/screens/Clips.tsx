/**
 * Clips — a TikTok-style, full-screen vertical feed of creator clips, each one
 * pinned to the restaurant it's about. Swipe / scroll for the next clip; only the
 * clip on screen plays (muted until you turn sound on, looping); tap to pause.
 * The right rail holds the restaurant's badge (open it / save it), a like, and
 * sound. The pin at the bottom names the restaurant, its area, award and
 * hashtag, and opens it. Everything plays inside the app.
 *
 * Opened beside the map (feed header, map screen) or from a restaurant's Media
 * tab, in which case that restaurant's clips come first.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { buildClipFeed, type FeedClip } from '../data/clipFeed';
import { guideBadgeOf } from '../data/chefs';
import { hashtagOf } from '../data/hashtags';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { Monogram } from '../components/Monogram';
import { ClipPlayer } from '../components/ClipPlayer';
import { HeartIcon, BookmarkIcon, MuteIcon, PlayIcon } from '../components/icons';

/** How many top venues to top up with a (cached) live search when the feed is thin. */
const WARM_VENUES = 8;

function compact(n?: number): string {
  if (!n) return '';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.0', '') + 'k';
  return String(n);
}

function RailButton({ label, onPress, children, active }: { label: string; onPress: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ alignItems: 'center', gap: 3 }} hitSlop={6}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: active ? C.ink400 : 'rgba(27,16,4,0.55)', borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </Pressable>
  );
}

function ClipPage({
  item,
  height,
  active,
  muted,
  onToggleMute,
}: {
  item: FeedClip;
  height: number;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const insets = useSafeAreaInsets();
  const openPlace = useStore((s) => s.openPlace);
  const toggleLike = useStore((s) => s.toggleLike);
  const toggleWant = useStore((s) => s.toggleWant);
  const liked = useStore((s) => !!s.liked['clip:' + item.clip.id]);
  const saved = useStore((s) => s.wantIds.includes(item.place.id) || !!s.saved[item.place.id]);
  const [paused, setPaused] = useState(false);
  useEffect(() => setPaused(false), [active]);

  const { clip, place } = item;
  const badge = guideBadgeOf(place);
  const likes = (clip.likes || 0) + (liked ? 1 : 0);

  return (
    <View style={{ height, width: '100%', backgroundColor: '#000' }}>
      {/* poster, then the live player once this clip is on screen */}
      {clip.thumb ? <Image source={{ uri: clip.thumb }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.55 }} contentFit="cover" blurRadius={active ? 18 : 0} /> : null}
      {active && clip.embedId ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ClipPlayer embedId={clip.embedId} paused={paused} muted={muted} />
        </View>
      ) : null}

      {/* tap anywhere to pause / play (also lets swipes reach the feed) */}
      <Pressable onPress={() => setPaused((p) => !p)} accessibilityLabel={paused ? 'Play clip' : 'Pause clip'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {paused || !active ? (
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(27,16,4,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <PlayIcon size={26} color={C.paper0} />
          </View>
        ) : null}
      </Pressable>

      {/* bottom scrim for legibility */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, backgroundColor: 'rgba(15,9,2,0.35)' }} />

      {/* right rail */}
      <View style={{ position: 'absolute', right: 10, bottom: insets.bottom + 120, alignItems: 'center', gap: 16 }}>
        <Pressable onPress={() => openPlace(place.id)} accessibilityLabel={`Open ${place.name}`} style={{ alignItems: 'center' }}>
          <Monogram name={place.name} size={50} />
          <Pressable
            onPress={() => toggleWant(place.id)}
            accessibilityLabel={saved ? `Saved ${place.name}` : `Save ${place.name}`}
            style={{ marginTop: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: saved ? C.stampGreen : C.ink400, borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center' }}
          >
            <Banner s={11} c={C.paper0}>
              {saved ? '✓' : '+'}
            </Banner>
          </Pressable>
        </Pressable>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <RailButton label={liked ? 'Unlike' : 'Like'} onPress={() => toggleLike('clip:' + clip.id)} active={liked}>
            <HeartIcon size={22} color={C.paper0} filled={liked} />
          </RailButton>
          <Mono s={9} c={C.paper0}>
            {compact(likes) || 'Like'}
          </Mono>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <RailButton label={saved ? 'Saved to want-to-try' : 'Save to want-to-try'} onPress={() => toggleWant(place.id)} active={saved}>
            <BookmarkIcon size={20} color={C.paper0} filled={saved} />
          </RailButton>
          <Mono s={9} c={C.paper0}>
            {saved ? 'Saved' : 'Save'}
          </Mono>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <RailButton label={muted ? 'Sound on' : 'Mute'} onPress={onToggleMute} active={!muted}>
            {muted ? (
              <MuteIcon size={20} color={C.paper0} />
            ) : (
              <Display s={16} c={C.paper0}>
                ♪
              </Display>
            )}
          </RailButton>
          <Mono s={9} c={C.paper0}>
            {muted ? 'Sound' : 'On'}
          </Mono>
        </View>
      </View>

      {/* credits + the restaurant this clip is about */}
      <View style={{ position: 'absolute', left: 14, right: 78, bottom: insets.bottom + 22, gap: 6 }}>
        <Banner s={11} tk={0.04} c={C.paper0} numberOfLines={1}>
          @{clip.creator}
        </Banner>
        <Serif s={13} c={C.paper0} numberOfLines={2} style={{ lineHeight: 18 }}>
          {clip.caption}
        </Serif>
        <Mono s={8.5} c={C.ink100} numberOfLines={1}>
          {['YouTube', clip.views ? `${compact(clip.views)} views` : '', clip.hd ? 'HD' : '', `#${hashtagOf(place)}`].filter(Boolean).join(' · ')}
        </Mono>
        <Pressable
          onPress={() => openPlace(place.id)}
          accessibilityLabel={`Restaurant: ${place.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%', marginTop: 4, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 }}
        >
          <Monogram name={place.name} size={24} />
          <View style={{ flexShrink: 1 }}>
            <Banner s={9.5} tk={0.04} c={C.inkDeep} numberOfLines={1}>
              {place.name}
            </Banner>
            <Mono s={8} c={C.inkMuted} numberOfLines={1}>
              {[place.hood, badge, place.price].filter(Boolean).join(' · ')}
            </Mono>
          </View>
          <Display s={13} c={C.ink400}>
            →
          </Display>
        </Pressable>
      </View>
    </View>
  );
}

export function Clips() {
  const insets = useSafeAreaInsets();
  const closeClips = useStore((s) => s.closeClips);
  const focusId = useStore((s) => s.clipsFocusId);
  const nearby = useStore((s) => s.nearby);
  const placeVideos = useStore((s) => s.placeVideos);
  const placeVideosStatus = useStore((s) => s.placeVideosStatus);
  const loadPlaceVideos = useStore((s) => s.loadPlaceVideos);
  const monthlyTrending = useStore((s) => s.monthlyTrending);
  const [pageH, setPageH] = useState(0);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  // Top up a thin feed: the focused restaurant plus the most acclaimed venues
  // (served from collected clips or the per-device cache; live search otherwise).
  useEffect(() => {
    const top = nearby
      .slice()
      .sort((a, b) => (b.acclaim || 0) - (a.acclaim || 0))
      .slice(0, WARM_VENUES)
      .map((p) => p.id);
    [focusId, ...top].forEach((id) => id && loadPlaceVideos(id));
  }, [nearby, focusId, loadPlaceVideos]);

  const feed = useMemo(() => {
    const extra = [...Object.values(placeVideos).flat(), ...monthlyTrending.map((t) => t.video)];
    return buildClipFeed(nearby, extra, focusId);
  }, [nearby, placeVideos, monthlyTrending, focusId]);

  const loading = Object.values(placeVideosStatus).some((st) => st === 'loading');
  const focusName = focusId ? nearby.find((p) => p.id === focusId)?.name : undefined;
  const cur = Math.min(index, Math.max(0, feed.length - 1));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
      {feed.length && pageH ? (
        <ScrollView
          pagingEnabled
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={50}
          onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / pageH))}
          style={{ flex: 1 }}
        >
          {feed.map((item, i) => (
            <ClipPage key={item.clip.id} item={item} height={pageH} active={i === cur} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 10 }}>
          <Banner s={12} tk={0.14} c={C.paper0}>
            {loading ? 'Finding clips…' : 'No clips yet'}
          </Banner>
          <Serif s={13} c={C.ink100} style={{ textAlign: 'center', lineHeight: 19 }}>
            Creator clips land here as they're found by each restaurant's hashtag: independent creators only, in HD, played right here.
          </Serif>
        </View>
      )}

      {/* top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={closeClips} accessibilityLabel="Back" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Display s={18} c={C.ink400}>
            ←
          </Display>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Banner s={12} tk={0.14} c={C.paper0}>
            Clips
          </Banner>
          {focusName ? (
            <Mono s={8.5} c={C.sun300} numberOfLines={1}>
              Starting with {focusName}
            </Mono>
          ) : null}
        </View>
        {feed.length ? (
          <View style={{ backgroundColor: 'rgba(27,16,4,0.6)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Mono s={9} c={C.paper0}>
              {cur + 1} / {feed.length}
            </Mono>
          </View>
        ) : null}
      </View>
    </View>
  );
}
