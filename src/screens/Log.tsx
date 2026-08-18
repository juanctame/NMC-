/**
 * Your Guide — a printed-almanac page of your dining journey. A visual tally
 * up top (spots stamped, average grade, a taste-spread bar of Loved/Fine/Not-it,
 * your turf), a Top-3 podium, then the full ranked list. Toggles to your
 * want-to-try list and taste-matched recs.
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { byId, RECS, type Place } from '../store/data';
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

/* ---------- the visual tally ---------- */

function StatTile({ big, label, roundel }: { big?: string; label: string; roundel?: { bg: string; fg: string; text: string } }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
      {roundel ? (
        <Roundel size={40} bg={roundel.bg} fg={roundel.fg} text={roundel.text} textSize={15} rot="-4deg" dashInset={4} />
      ) : (
        <Display s={26} c={C.inkDeep}>
          {big}
        </Display>
      )}
      <Banner s={8.5} tk={0.14} c={C.inkSoft} style={{ marginTop: 5 }}>
        {label}
      </Banner>
    </View>
  );
}

function SpreadBar({ loved, fine, notit, total }: { loved: number; fine: number; notit: number; total: number }) {
  const seg = [
    { n: loved, c: C.stampGreen, fg: C.greenFg, l: 'Loved' },
    { n: fine, c: C.sun400, fg: C.inkDeep, l: 'Fine' },
    { n: notit, c: C.stampPink, fg: C.pinkFg, l: 'Not it' },
  ];
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 26, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 6, overflow: 'hidden', backgroundColor: C.paper100 }}>
        {seg.map((s, i) =>
          s.n > 0 ? (
            <View
              key={s.l}
              style={{ flex: s.n, backgroundColor: s.c, alignItems: 'center', justifyContent: 'center', borderRightWidth: i < seg.length - 1 && seg.slice(i + 1).some((x) => x.n > 0) ? 2 : 0, borderColor: C.inkBlack }}
            >
              <Display s={12} c={s.fg}>
                {s.n}
              </Display>
            </View>
          ) : null
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {seg.map((s) => (
          <View key={s.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.c, borderWidth: 1.5, borderColor: C.inkBlack }} />
            <Mono s={9.5} c={C.inkMuted}>
              {s.l} {s.n}
            </Mono>
          </View>
        ))}
      </View>
    </View>
  );
}

function TallyPanel({ ranked }: { ranked: Place[] }) {
  const s = useMemo(() => {
    const scored = ranked.filter((r) => r.score != null);
    const n = scored.length;
    const avg = n ? scored.reduce((a, r) => a + (r.score || 0), 0) / n : 0;
    const loved = scored.filter((r) => (r.score || 0) >= 8).length;
    const fine = scored.filter((r) => (r.score || 0) >= 6 && (r.score || 0) < 8).length;
    const notit = scored.filter((r) => (r.score || 0) < 6).length;
    const hoodCount: Record<string, number> = {};
    scored.forEach((r) => (hoodCount[r.hood] = (hoodCount[r.hood] || 0) + 1));
    const topHood = Object.entries(hoodCount).sort((a, b) => b[1] - a[1])[0];
    const cuisines = new Set(scored.map((r) => r.cuisine)).size;
    return { n, avg, loved, fine, notit, topHood, cuisines };
  }, [ranked]);

  const as = scoreStyle(s.avg);

  return (
    <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, padding: 14, gap: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink400 }} />
        <Banner s={10} tk={0.18} c={C.inkMuted}>
          The tally
        </Banner>
        <View style={{ flex: 1, height: 2, backgroundColor: C.ink100, marginLeft: 2 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <StatTile big={String(s.n)} label="STAMPED" />
        <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: C.ink100 }} />
        <StatTile roundel={{ bg: as.bg, fg: as.fg, text: fmt(s.avg) }} label="AVG GRADE" />
        <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: C.ink100 }} />
        <StatTile big={String(s.cuisines)} label="CUISINES" />
      </View>

      <View style={{ gap: 8 }}>
        <Banner s={9} tk={0.14} c={C.inkSoft}>
          Taste spread
        </Banner>
        <SpreadBar loved={s.loved} fine={s.fine} notit={s.notit} total={s.n} />
      </View>

      {s.topHood ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 2, borderColor: C.ink100, paddingTop: 11 }}>
          <Mono s={9.5} c={C.inkSoft}>
            YOUR TURF
          </Mono>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Banner s={10} tk={0.06} c={C.inkDeep}>
              {s.topHood[0]}
            </Banner>
            <Display s={11} c={C.inkDeep}>
              ×{s.topHood[1]}
            </Display>
          </View>
          <View style={{ flex: 1 }} />
          <SerifItalic s={11.5} c={C.inkMuted}>
            most-stamped
          </SerifItalic>
        </View>
      ) : null}
    </StickerView>
  );
}

/* ---------- the podium ---------- */

const MEDAL = [
  { bg: C.sun400, ring: C.ink400 },
  { bg: C.paper0, ring: C.inkSoft },
  { bg: C.paper0, ring: C.inkSoft },
];

function PodiumCard({ item, rank }: { item: Place; rank: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const ss = scoreStyle(item.score || 0);
  const m = MEDAL[rank - 1];
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openPlace(item.id)}
      style={{ flex: 1, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}
    >
      <View>
        <Photo source={photo(item.photo)} style={{ width: '100%', height: 74, borderBottomWidth: 2, borderColor: C.inkBlack }} />
        <View style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: m.bg, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
          <Display s={12} c={C.inkDeep}>
            {rank}
          </Display>
        </View>
        <View style={{ position: 'absolute', bottom: -12, right: 5 }}>
          <Roundel size={30} bg={ss.bg} fg={ss.fg} text={fmt(item.score || 0)} textSize={11} rot="-5deg" border={2} />
        </View>
      </View>
      <View style={{ paddingTop: 15, paddingBottom: 9, paddingHorizontal: 8 }}>
        <SerifDisplay s={12.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 14 }}>
          {item.name}
        </SerifDisplay>
        <Mono s={8} c={C.inkSoft} numberOfLines={1} style={{ marginTop: 2 }}>
          {item.cuisine}
        </Mono>
      </View>
    </StickerPressable>
  );
}

/* ---------- list rows ---------- */

function BeenRow({ item, rank }: { item: Place; rank: number }) {
  const openPlace = useStore((s) => s.openPlace);
  const ss = scoreStyle(item.score || 0);
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openPlace(item.id)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 11 }}
    >
      <View style={{ width: 26, alignItems: 'center' }}>
        <Display s={18} c={C.inkSoft}>
          {rank}
        </Display>
      </View>
      <Photo source={photo(item.photo)} style={{ width: 56, height: 56, borderWidth: 2, borderColor: C.inkBlack }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifDisplay s={15.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
          {item.name}
        </SerifDisplay>
        <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }}>
          {metaOf(item)}
        </Mono>
      </View>
      <Roundel size={44} bg={ss.bg} fg={ss.fg} text={fmt(item.score || 0)} textSize={15} rot="-5deg" />
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

function SectionLabel({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12, paddingHorizontal: 2 }}>
      <Banner s={11} tk={0.16} c={C.inkDeep}>
        {children}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {note ? (
        <Mono s={9} c={C.inkSoft}>
          {note}
        </Mono>
      ) : null}
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, borderStyle: 'dashed', paddingVertical: 26, paddingHorizontal: 18, alignItems: 'center', gap: 6, marginTop: 8 }}>
      <SerifDisplay s={17} c={C.inkDeep}>
        {title}
      </SerifDisplay>
      <Serif s={12.5} c={C.inkMuted} style={{ textAlign: 'center', lineHeight: 18 }}>
        {body}
      </Serif>
    </StickerView>
  );
}

/* ---------- screen ---------- */

export function Log() {
  const insets = useSafeAreaInsets();
  const logSeg = useStore((s) => s.logSeg);
  const setLogSeg = useStore((s) => s.setLogSeg);
  const ranked = useStore((s) => s.ranked); // stable ref — derive lists below
  const wantIds = useStore((s) => s.wantIds);
  const t = useT();

  const scored = ranked.filter((r) => r.score != null);
  const podium = scored.slice(0, 3);
  const rest = scored.slice(3);

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: C.paper50, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Display s={30} c={C.inkDeep}>
            {t('log.title')}
          </Display>
          <Mono s={10} c={C.inkMuted}>
            {scored.length} stamped
          </Mono>
        </View>
        <SerifItalic s={12} c={C.inkMuted} style={{ marginTop: 2 }}>
          Everywhere you’ve been, ranked — and where you’re headed next.
        </SerifItalic>
        <View style={{ marginTop: 14 }}>
          <Segmented
            items={[
              { key: 'been', label: t('log.been') },
              { key: 'want', label: t('log.want') },
              { key: 'recs', label: t('log.recs') },
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
          scored.length === 0 ? (
            <EmptyState title="Your guide starts here" body="Rank your first spot and it’ll land on your podium. Every place you stamp builds your taste map." />
          ) : (
            <View>
              <TallyPanel ranked={ranked} />
              {podium.length > 0 ? (
                <>
                  <SectionLabel note="tap to open">On the podium</SectionLabel>
                  <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
                    {podium.map((item, i) => (
                      <PodiumCard key={item.id} item={item} rank={i + 1} />
                    ))}
                  </View>
                </>
              ) : null}
              {rest.length > 0 ? (
                <>
                  <SectionLabel note={`${rest.length} more`}>The full list</SectionLabel>
                  <View style={{ gap: 10 }}>
                    {rest.map((item, i) => (
                      <BeenRow key={item.id} item={item} rank={i + 4} />
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          )
        ) : null}

        {logSeg === 'want' ? (
          wantIds.length === 0 ? (
            <EmptyState title="Nothing saved yet" body="Save a spot from a friend’s review or the map and it’ll queue up here, ready to rank once you go." />
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, marginBottom: 2 }}>
                <Display s={22} c={C.ink400}>
                  {wantIds.length}
                </Display>
                <SerifItalic s={13} c={C.inkMuted}>
                  spots waiting on your list
                </SerifItalic>
              </View>
              {wantIds.map((id) => (
                <WantRow key={id} id={id} />
              ))}
              <Mono s={10} c={C.inkSoft} style={{ textAlign: 'center', marginTop: 6 }}>
                Saved from friends & your recs · pin drops as you go
              </Mono>
            </View>
          )
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
