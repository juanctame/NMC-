/**
 * Your Log — the user's ranked list (Been), want-to-try (Want), and Recs.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { byId, RECS } from '../store/data';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { Segmented } from '../components/Segmented';
import { Roundel } from '../components/Roundel';
import { BookmarkIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

function BeenRow({ id, rank }: { id: string; rank: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const item = useStore((s) => s.ranked.find((r) => r.id === id)!);
  const ss = scoreStyle(item.score!);
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openPlace(id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        backgroundColor: C.paper0,
        borderWidth: 2.5,
        borderColor: C.inkBlack,
        paddingVertical: 9,
        paddingHorizontal: 11,
      }}
    >
      <View style={{ width: 30, alignItems: 'center' }}>
        <Display s={19} c={C.ink400}>
          {rank}
        </Display>
      </View>
      <Photo source={photo(item.photo)} style={{ width: 58, height: 58, borderWidth: 2, borderColor: C.inkBlack }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={15.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
          {item.name}
        </SerifDisplay>
        <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }}>
          {metaOf(item)}
        </Mono>
      </View>
      <Roundel size={44} bg={ss.bg} fg={ss.fg} text={fmt(item.score!)} textSize={15} rot="-5deg" />
    </StickerPressable>
  );
}

function WantRow({ id }: { id: string }) {
  const openPlace = useStore((s) => s.openPlace);
  const startRank = useStore((s) => s.startRank);
  const w = byId[id];
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row' }}>
      <Pressable onPress={() => openPlace(id)} style={{ borderRightWidth: 2, borderColor: C.inkBlack }}>
        <Photo source={photo(w.photo)} style={{ width: 66, height: '100%' }} />
      </Pressable>
      <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 4 }}>
        <Pressable onPress={() => openPlace(id)}>
          <SerifDisplay s={15.5} c={C.inkDeep} style={{ lineHeight: 17 }}>
            {w.name}
          </SerifDisplay>
          <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
            {metaOf(w)}
          </Mono>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Mono s={9} c={C.inkSoft} numberOfLines={1} style={{ flex: 1 }}>
            {w.by || 'On your list'}
          </Mono>
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => startRank(id)}
            style={{ borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.ink400, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
          >
            <Banner s={9.5} tk={0.1} c={C.paper0}>
              Been? Rank it
            </Banner>
          </StickerPressable>
        </View>
      </View>
    </StickerView>
  );
}

function RecRow({ placeId, match, reason }: { placeId: string; match: string; reason: string }) {
  const openPlace = useStore((s) => s.openPlace);
  const toggleSave = useStore((s) => s.toggleSave);
  const savedOn = useStore((s) => !!s.saved[placeId]);
  const p = byId[placeId];
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <Pressable onPress={() => openPlace(placeId)}>
        <Photo source={photo(p.photo)} style={{ width: '100%', height: 132, borderBottomWidth: 2, borderColor: C.inkBlack }} />
        <View style={{ position: 'absolute', top: 10, right: 10, transform: [{ rotate: '3deg' }] }}>
          <StickerView offset="sm" radius={999} style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Banner s={10} tk={0.06} c={C.inkDeep}>
              {match} match
            </Banner>
          </StickerView>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 13 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SerifDisplay s={16} c={C.inkDeep} style={{ lineHeight: 18 }}>
            {p.name}
          </SerifDisplay>
          <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
            {reason}
          </Mono>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => toggleSave(placeId)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: C.paper0 }}
        >
          <BookmarkIcon size={14} color={savedOn ? C.stampGreen : C.inkDeep} filled={savedOn} />
          <Banner s={9.5} tk={0.1} c={savedOn ? C.stampGreen : C.inkDeep}>
            {savedOn ? 'Saved' : 'Save'}
          </Banner>
        </StickerPressable>
      </View>
    </StickerView>
  );
}

export function Log() {
  const insets = useSafeAreaInsets();
  const logSeg = useStore((s) => s.logSeg);
  const setLogSeg = useStore((s) => s.setLogSeg);
  const rankedIds = useStore((s) => s.ranked.map((r) => r.id));
  const wantIds = useStore((s) => s.wantIds);
  const beenTotal = rankedIds.length;

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: C.paper50, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Display s={30} c={C.inkDeep}>
            Your log
          </Display>
          <Mono s={10} c={C.inkMuted}>
            {beenTotal} stamped
          </Mono>
        </View>
        <View style={{ marginTop: 14 }}>
          <Segmented
            items={[
              { key: 'been', label: 'Been' },
              { key: 'want', label: 'Want to try' },
              { key: 'recs', label: 'Recs' },
            ]}
            value={logSeg}
            onChange={(k) => setLogSeg(k as any)}
            activeFg={C.inkDeep}
            inactiveFg={C.inkSoft}
            activeBorder={C.ink400}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {logSeg === 'been' ? (
          <View style={{ gap: 10 }}>
            {rankedIds.map((id, i) => (
              <BeenRow key={id} id={id} rank={i + 1} />
            ))}
          </View>
        ) : null}

        {logSeg === 'want' ? (
          <View style={{ gap: 12 }}>
            {wantIds.map((id) => (
              <WantRow key={id} id={id} />
            ))}
            <Mono s={10} c={C.inkSoft} style={{ textAlign: 'center', marginTop: 6 }}>
              Saved from friends & your recs · pin drops as you go
            </Mono>
          </View>
        ) : null}

        {logSeg === 'recs' ? (
          <View style={{ gap: 12 }}>
            <SerifItalic s={13} c={C.inkMuted} style={{ paddingHorizontal: 2, paddingTop: 2, paddingBottom: 4 }}>
              Matched to your taste and the friends you trust.
            </SerifItalic>
            {RECS.map((rc) => (
              <RecRow key={rc.placeId} placeId={rc.placeId} match={rc.match} reason={rc.reason} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenIn>
  );
}
