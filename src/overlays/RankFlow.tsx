/**
 * Rank flow (bottom sheet). Log + rank a place via binary comparison, producing
 * a 0–10 score: Pick → Bucket (gut reaction) → Compare (which was better?) →
 * Result (final score roundel + list position).
 */
import React from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CAND, WANT0, byId } from '../store/data';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { Roundel } from '../components/Roundel';
import { SheetUp, StampIn } from '../components/Anim';

const KICKER: Record<string, string> = {
  pick: 'Add to your log',
  bucket: 'Step 1 · gut check',
  compare: 'Step 2 · pin it',
  result: 'Done',
};
const TITLE: Record<string, string> = {
  pick: 'What did you eat?',
  bucket: 'Rank it',
  compare: 'Rank it',
  result: 'Stamped',
};

const BUCKETS = [
  { key: 'loved', label: 'I loved it', hint: 'Top tier — 8 to 10', color: C.stampGreen, rot: '-6deg' },
  { key: 'fine', label: 'It was fine', hint: 'Solid — 6 to 8', color: C.sun400, rot: '4deg' },
  { key: 'meh', label: 'Not my thing', hint: 'Below the bar — under 6', color: C.stampPink, rot: '-4deg' },
] as const;

export function RankFlow() {
  const insets = useSafeAreaInsets();
  const step = useStore((s) => s.rankStep);
  const rankId = useStore((s) => s.rankId);
  const rankSearch = useStore((s) => s.rankSearch);
  const ranked = useStore((s) => s.ranked);
  const sub = useStore((s) => s.sub);
  const clo = useStore((s) => s.clo);
  const chi = useStore((s) => s.chi);
  const cmpCount = useStore((s) => s.cmpCount);
  const resScore = useStore((s) => s.resScore);
  const resPos = useStore((s) => s.resPos);

  const closeRank = useStore((s) => s.closeRank);
  const setRankSearch = useStore((s) => s.setRankSearch);
  const pickRank = useStore((s) => s.pickRank);
  const chooseBucket = useStore((s) => s.chooseBucket);
  const doCompare = useStore((s) => s.doCompare);
  const rankAgain = useStore((s) => s.rankAgain);
  const seeLog = useStore((s) => s.seeLog);

  const rankedSet = new Set(ranked.map((r) => r.id));
  const q = rankSearch.trim().toLowerCase();
  const pool = [...CAND, ...WANT0].filter((p) => !rankedSet.has(p.id));
  const seen = new Set<string>();
  const poolU = pool.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const pickList = poolU.filter((p) => !q || p.name.toLowerCase().includes(q));

  const chosen = rankId ? byId[rankId] : null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <SheetUp style={{ flex: 1, backgroundColor: C.paper50 }}>
        {/* header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.sun400 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={closeRank} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={15} c={C.ink400}>
                ✕
              </Display>
            </Pressable>
          </StickerView>
          <View>
            <Banner s={9} tk={0.16} c={C.ink600}>
              {KICKER[step]}
            </Banner>
            <Display s={20} c={C.inkDeep}>
              {TITLE[step]}
            </Display>
          </View>
        </View>

        {/* STEP: PICK */}
        {step === 'pick' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <StickerView offset="sm" radius={999}>
              <TextInput
                value={rankSearch}
                onChangeText={setRankSearch}
                placeholder="Search a place you ate…"
                placeholderTextColor={C.inkSoft}
                style={{ fontFamily: 'Fraunces_400Regular', fontSize: 15, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, color: C.inkBlack }}
              />
            </StickerView>
            <Banner s={9} tk={0.16} c={C.inkMuted} style={{ marginTop: 18, marginBottom: 10 }}>
              {q ? 'Matches' : 'From your list & nearby'}
            </Banner>
            <View style={{ gap: 9 }}>
              {pickList.map((p) => (
                <StickerPressable
                  key={p.id}
                  offset="sm"
                  onPress={() => pickRank(p.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 }}
                >
                  <Photo source={photo(p.photo)} style={{ width: 52, height: 52, borderWidth: 2, borderColor: C.inkBlack }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <SerifDisplay s={15} c={C.inkDeep} style={{ lineHeight: 17 }}>
                      {p.name}
                    </SerifDisplay>
                    <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                      {metaOf(p)}
                    </Mono>
                  </View>
                  <Display s={20} c={C.ink400}>
                    +
                  </Display>
                </StickerPressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {/* STEP: BUCKET */}
        {step === 'bucket' && chosen ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: insets.bottom + 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Photo source={photo(chosen.photo)} style={{ width: 56, height: 56, borderWidth: 2, borderColor: C.inkBlack }} />
              <View>
                <SerifDisplay s={17} c={C.inkDeep} style={{ lineHeight: 18 }}>
                  {chosen.name}
                </SerifDisplay>
                <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 3 }}>
                  {metaOf(chosen)}
                </Mono>
              </View>
            </View>
            <Display s={26} c={C.inkDeep} style={{ marginTop: 26, marginBottom: 4, textAlign: 'center' }}>
              How was it?
            </Display>
            <SerifItalic s={13} c={C.inkMuted} style={{ textAlign: 'center', marginBottom: 22 }}>
              Gut reaction. We'll pin the exact spot next.
            </SerifItalic>
            <View style={{ gap: 14 }}>
              {BUCKETS.map((b) => (
                <StickerPressable
                  key={b.key}
                  offset="sm"
                  onPress={() => chooseBucket(b.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 14, paddingHorizontal: 16 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: b.color, borderWidth: 2.5, borderColor: C.inkBlack, transform: [{ rotate: b.rot }] }} />
                  <View>
                    <Banner s={15} tk={0.06} c={C.inkDeep}>
                      {b.label}
                    </Banner>
                    <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }}>
                      {b.hint}
                    </Mono>
                  </View>
                </StickerPressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {/* STEP: COMPARE */}
        {step === 'compare' && chosen && sub.length ? (
          <CompareStep
            chosen={chosen}
            opp={ranked[sub[(clo + chi) >> 1]]}
            cur={cmpCount + 1}
            total={Math.max(1, Math.ceil(Math.log2(sub.length + 1)))}
            onNew={() => doCompare(true)}
            onOld={() => doCompare(false)}
            insetBottom={insets.bottom}
          />
        ) : null}

        {/* STEP: RESULT */}
        {step === 'result' && chosen ? (
          <ResultStep
            chosen={chosen}
            score={resScore != null ? fmt(resScore) : ''}
            band={resScore != null ? scoreStyle(resScore) : { bg: C.sun400, fg: C.inkDeep }}
            pos={resPos != null ? resPos + 1 : 0}
            total={ranked.length}
            onAgain={rankAgain}
            onSeeLog={seeLog}
            insetBottom={insets.bottom}
          />
        ) : null}
      </SheetUp>
    </View>
  );
}

function CompareStep({
  chosen,
  opp,
  cur,
  total,
  onNew,
  onOld,
  insetBottom,
}: {
  chosen: (typeof byId)[string];
  opp: (typeof byId)[string];
  cur: number;
  total: number;
  onNew: () => void;
  onOld: () => void;
  insetBottom: number;
}) {
  const os = scoreStyle(opp.score!);
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: insetBottom + 24 }}>
      <View style={{ alignItems: 'center' }}>
        <Display s={25} c={C.inkDeep}>
          Which was better?
        </Display>
        <Mono s={10} c={C.inkMuted} style={{ marginTop: 6 }}>
          Comparison {cur} of ~{total}
        </Mono>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12, paddingVertical: 14 }}>
        <StickerPressable offset="lg" onPress={onNew} style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }}>
          <Photo source={photo(chosen.photo)} style={{ width: 96, height: 84, borderRightWidth: 2.5, borderColor: C.inkBlack }} />
          <View style={{ paddingVertical: 10, paddingHorizontal: 13, flex: 1 }}>
            <Banner s={8} tk={0.16} c={C.ink400}>
              The new one
            </Banner>
            <SerifDisplay s={16} c={C.inkDeep} style={{ marginTop: 2, lineHeight: 17 }}>
              {chosen.name}
            </SerifDisplay>
            <Mono s={9} c={C.inkMuted} style={{ marginTop: 3 }}>
              {metaOf(chosen)}
            </Mono>
          </View>
        </StickerPressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View style={{ height: 2, flex: 1, backgroundColor: 'rgba(42,26,6,0.2)' }} />
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sun400, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
            <Display s={13} c={C.inkDeep}>
              OR
            </Display>
          </View>
          <View style={{ height: 2, flex: 1, backgroundColor: 'rgba(42,26,6,0.2)' }} />
        </View>

        <StickerPressable offset="lg" onPress={onOld} style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }}>
          <Photo source={photo(opp.photo)} style={{ width: 96, height: 84, borderRightWidth: 2.5, borderColor: C.inkBlack }} />
          <View style={{ paddingVertical: 10, paddingHorizontal: 13, flex: 1 }}>
            <Banner s={8} tk={0.16} c={C.inkMuted}>
              Already ranked
            </Banner>
            <SerifDisplay s={16} c={C.inkDeep} style={{ marginTop: 2, lineHeight: 17 }}>
              {opp.name}
            </SerifDisplay>
            <Mono s={9} c={C.inkMuted} style={{ marginTop: 3 }}>
              {metaOf(opp)}
            </Mono>
          </View>
          <View style={{ marginRight: 12 }}>
            <Roundel size={42} bg={os.bg} fg={os.fg} text={fmt(opp.score!)} textSize={14} rot="-5deg" />
          </View>
        </StickerPressable>
      </View>
      <View style={{ alignItems: 'center' }}>
        <StickerPressable offset="sm" radius={999} onPress={onOld} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 9, paddingHorizontal: 18 }}>
          <Banner s={10} tk={0.12} c={C.inkMuted}>
            Too close to call
          </Banner>
        </StickerPressable>
      </View>
    </ScrollView>
  );
}

function ResultStep({
  chosen,
  score,
  band,
  pos,
  total,
  onAgain,
  onSeeLog,
  insetBottom,
}: {
  chosen: (typeof byId)[string];
  score: string;
  band: { bg: string; fg: string };
  pos: number;
  total: number;
  onAgain: () => void;
  onSeeLog: () => void;
  insetBottom: number;
}) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: insetBottom + 26, alignItems: 'center' }}>
      <Banner s={10} tk={0.18} c={C.inkMuted} style={{ marginTop: 6 }}>
        Stamped into your passport
      </Banner>
      <StampIn rotate="0deg" style={{ marginTop: 20, marginBottom: 8 }}>
        <StickerView offset="lg" radius={999}>
          <Roundel size={156} bg={band.bg} fg={band.fg} border={3} dashInset={10}>
            <Display s={52} c={band.fg} style={{ lineHeight: 48 }}>
              {score}
            </Display>
            <Banner s={9} tk={0.14} c={band.fg} style={{ marginTop: 4 }}>
              out of ten
            </Banner>
          </Roundel>
        </StickerView>
      </StampIn>
      <Display s={26} c={C.inkDeep} style={{ marginTop: 12, textAlign: 'center' }}>
        {chosen.name}
      </Display>
      <Serif s={14.5} style={{ marginTop: 8, textAlign: 'center' }}>
        Lands at{' '}
        <Banner s={14.5} tk={0.04} c={C.ink400}>
          Nº {pos}
        </Banner>{' '}
        of {total} in your log.
      </Serif>
      <View style={{ flex: 1, minHeight: 24 }} />
      <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 24 }}>
        <StickerPressable offset="sm" radius={999} onPress={onAgain} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 13, backgroundColor: C.paper0 }}>
          <Banner s={12} tk={0.1} c={C.inkDeep}>
            Rank another
          </Banner>
        </StickerPressable>
        <StickerPressable offset="sm" radius={999} onPress={onSeeLog} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 13, backgroundColor: C.ink400 }}>
          <Banner s={12} tk={0.1} c={C.paper0}>
            See my log →
          </Banner>
        </StickerPressable>
      </View>
    </ScrollView>
  );
}
