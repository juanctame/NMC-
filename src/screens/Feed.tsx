/**
 * Feed (home) — social home: trending strip, friends' activity, personalized
 * recs, and (once unlocked) the Dine Club teaser.
 */
import React from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { FEED, RECS, TRENDING, byId } from '../store/data';
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

function HeaderIconButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <StickerView offset="sm" radius={999}>
      <Pressable
        onPress={onPress}
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

function TrendingThumb({ id, rank, onPress }: { id: string; rank: number; onPress: () => void }) {
  const p = byId[id];
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
      <View
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: C.sun400,
          borderWidth: 2,
          borderColor: C.inkBlack,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Display s={10} c={C.inkDeep}>
          {rank}
        </Display>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: 'rgba(251,245,229,0.92)',
            borderWidth: 2,
            borderColor: C.inkBlack,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayIcon size={12} color={C.ink400} />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.inkBlack }}>
        <Banner s={8} tk={0.06} c={C.paper0} numberOfLines={1}>
          {p.name}
        </Banner>
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

export function Feed() {
  const insets = useSafeAreaInsets();
  const tapLogo = useStore((s) => s.tapLogo);
  const goMap = useStore((s) => s.openMap);
  const goBoard = useStore((s) => s.go);
  const openReel = useStore((s) => s.openReel);
  const clubUnlocked = useStore((s) => s.clubUnlocked);

  return (
    <ScreenIn>
      {/* header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: C.sun400, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <Grain opacity={0.06} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={tapLogo} accessibilityLabel="NO MAD CORNER">
            <Image source={BRAND.logo} style={{ width: 46, height: 46, transform: [{ rotate: '-6deg' }] }} resizeMode="contain" />
            {clubUnlocked ? (
              <View style={{ position: 'absolute', top: -1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: C.ink400, borderWidth: 2, borderColor: C.paper0 }} />
            ) : null}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Display s={15} c={C.inkDeep} numberOfLines={1}>
              NO MAD CORNER
            </Display>
            <Mono s={9} c={C.ink600} style={{ marginTop: 4 }}>
              AROUND THE TABLE · CDMX · 24°C
            </Mono>
          </View>
          <HeaderIconButton onPress={goMap}>
            <MapIcon size={16} color={C.ink400} />
          </HeaderIconButton>
          <HeaderIconButton onPress={() => goBoard('board' as any)}>
            <ChartIcon size={16} color={C.ink400} />
          </HeaderIconButton>
        </View>
      </View>

      {/* body */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Banner s={11} tk={0.14} c={C.inkDeep}>
              Trending now
            </Banner>
            <Mono s={9} c={C.inkSoft}>
              tap to watch →
            </Mono>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {TRENDING.map((id, i) => (
              <TrendingThumb key={id} id={id} rank={i + 1} onPress={() => openReel(i)} />
            ))}
          </ScrollView>
        </View>

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
