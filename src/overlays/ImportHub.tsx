/**
 * Bring your places — fill your passport from the lists you already keep:
 * Beli (screenshots or a copied list), Google Maps (Takeout: saved lists,
 * starred places, reviews, Timeline; or pasted links), Notes / any pasted list,
 * your food photos, or any CSV / JSON / KML file. Everything is read on this
 * device. Each entry is matched to a real place (placeMatch.ts); you review the
 * matches, choose Been or Want to try, and add them in one go — your own scores
 * come along.
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { byId as seedById, type Place } from '../store/data';
import { CARTE_CDMX } from '../data/carte';
import { parseListText, entriesFromFile, type ImportEntry, type ImportSource, type ImportList } from '../data/importers';
import { matchAll, placeFromEntry, SOURCE_LABEL, type MatchResult } from '../data/placeMatch';
import { loadAllSpots, spotToPlace } from '../data/spots';
import { ocrSupported, pickImages, pickFiles, ocrScreens, readText } from '../data/ocr';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifDisplay, Mono } from '../components/Text';
import { StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

type Step = 'pick' | 'paste' | 'reading' | 'review' | 'done' | 'empty';
type Row = { key: string; r: MatchResult; on: boolean; list: ImportList; pick: number }; // pick: -1 = new place, 0 = best, 1.. = alternatives

const SOURCES: { id: ImportSource; title: string; sub: string; how: string; glyph: string }[] = [
  { id: 'beli', title: 'Beli', sub: 'Screenshots of your lists, or a copied list', how: 'In Beli open Profile → your Been (or Want to Try) list and take screenshots as you scroll. Pick them all at once — your scores come along.', glyph: 'B' },
  { id: 'google', title: 'Google Maps', sub: 'Saved lists, starred places, reviews — or links', how: 'takeout.google.com → select only “Saved” and “Maps (your places)” → export → unzip → choose the files (Saved/*.csv, Saved Places.json, Reviews.json). Or paste Maps links.', glyph: 'G' },
  { id: 'notes', title: 'Notes & any list', sub: 'Paste from Notes, WhatsApp, a doc…', how: 'Paste the list — one place per line. Scores like 9/10, 4.5/5 or ★★★★ and headings like “Want to try:” are understood.', glyph: '✎' },
  { id: 'photos', title: 'Photos', sub: 'Food photos → the spots they were taken at', how: 'We read each photo’s location on this device and find the restaurant there.', glyph: '◉' },
  { id: 'file', title: 'Any file', sub: 'CSV, JSON or KML (Google My Maps)', how: 'Any spreadsheet with a name column works — score, notes, list, latitude/longitude are picked up when present.', glyph: '⇪' },
];

function Btn({ label, onPress, bg = C.ink400, fg = C.paper0, disabled, small, a11y }: { label: string; onPress: () => void; bg?: string; fg?: string; disabled?: boolean; small?: boolean; a11y?: string }) {
  return (
    <StickerPressable
      offset="sm"
      radius={999}
      onPress={disabled ? () => {} : onPress}
      disabled={disabled}
      accessibilityLabel={a11y || label}
      style={{ alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: bg, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 14 : 18, opacity: disabled ? 0.45 : 1 }}
    >
      <Banner s={small ? 10 : 12.5} tk={0.08} c={fg}>
        {label}
      </Banner>
    </StickerPressable>
  );
}

/** Everything CRTQ knows, to recognise your places in. */
async function candidates(nearby: Place[]): Promise<Place[]> {
  const spots = (await loadAllSpots()).filter((s) => !s.guide).map(spotToPlace);
  return [...CARTE_CDMX, ...Object.values(seedById), ...nearby, ...spots];
}

export function ImportHub() {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeImport);
  const initial = useStore((s) => s.importSource);
  const nearby = useStore((s) => s.nearby);
  const applyImport = useStore((s) => s.applyImport);
  const openPhotoImport = useStore((s) => s.openPhotoImport);
  const [source, setSource] = useState<ImportSource | null>(initial && initial !== 'photos' ? initial : null);
  const [step, setStep] = useState<Step>(initial === 'notes' ? 'paste' : 'pick');
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [shown, setShown] = useState(120);
  const [result, setResult] = useState<{ been: number; want: number } | null>(null);
  const [problem, setProblem] = useState('');
  const canFiles = Platform.OS === 'web' && ocrSupported();

  const review = async (entries: ImportEntry[], src: ImportSource) => {
    if (!entries.length) {
      setStep('empty');
      return;
    }
    setStatus(`Matching ${entries.length} places…`);
    const res = matchAll(entries, await candidates(nearby)).filter((r) => r.place || !r.entry.onlyIfMatched);
    if (!res.length) {
      setStep('empty');
      return;
    }
    // Google "saved" lists are things to try; Beli screenshots of Been are been — the
    // source's own label wins, then the default for that kind of list.
    const dflt: ImportList = src === 'google' ? 'want' : 'been';
    setRows(res.map((r, i) => ({ key: `${i}-${r.entry.name}`, r, on: r.confidence !== 'none' || !!r.entry.name, list: r.entry.list || dflt, pick: r.place ? 0 : -1 })));
    setShown(120);
    setStep('review');
  };

  const run = async (what: () => Promise<ImportEntry[]>, src: ImportSource) => {
    setSource(src);
    setProblem('');
    setStep('reading');
    setStatus('Reading…');
    try {
      await review(await what(), src);
    } catch (e) {
      setProblem(String((e as Error)?.message || e));
      setStep('pick');
    }
  };

  const fromScreens = (src: ImportSource) =>
    run(async () => {
      const files = await pickImages();
      if (!files.length) throw new Error('');
      const t = await ocrScreens(files, setStatus);
      return parseListText(t, { strict: true }); // screenshots: drop OCR noise
    }, src);

  const fromFiles = (src: ImportSource) =>
    run(async () => {
      const files = await pickFiles('.csv,.tsv,.json,.geojson,.kml,.txt,text/*,application/json', true);
      if (!files.length) throw new Error('');
      const out: ImportEntry[] = [];
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) throw new Error('Unzip the Takeout file first, then choose the files inside it.');
        out.push(...entriesFromFile(f.name, await readText(f)));
      }
      return out;
    }, src);

  const fromText = () => run(async () => parseListText(text), source || 'notes');

  const choose = (r: Row): Place => {
    const res = r.r;
    if (r.pick < 0 || !res.place) return placeFromEntry(res.entry, source || 'file');
    return r.pick === 0 ? res.place : res.alts[r.pick - 1] || res.place;
  };

  const add = () => {
    const items = rows
      .filter((r) => r.on)
      .map((r) => ({ place: { ...choose(r), importedFrom: source || 'file' }, list: r.list, score: r.r.entry.score }));
    setResult(applyImport(items));
    setStep('done');
  };

  const counts = useMemo(() => {
    const on = rows.filter((r) => r.on);
    return { on: on.length, been: on.filter((r) => r.list === 'been').length, want: on.filter((r) => r.list === 'want').length, matched: rows.filter((r) => r.r.place).length, fresh: rows.filter((r) => !r.r.place).length };
  }, [rows]);
  const setAll = (patch: Partial<Row>) => setRows((rs) => rs.map((r) => ({ ...r, ...patch })));
  const setRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      <Pressable onPress={close} accessibilityLabel="Close import" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,12,4,0.5)' }} />
      <SheetUp style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: insets.top + 28, backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }}>
        <View accessibilityLabel="Bring your places" style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, gap: 10 }}>
            {step !== 'pick' && step !== 'reading' ? (
              <Pressable onPress={() => setStep('pick')} accessibilityLabel="Back to sources" hitSlop={8}>
                <Display s={16} c={C.ink400}>
                  ←
                </Display>
              </Pressable>
            ) : null}
            <Display s={22} c={C.inkDeep} style={{ flex: 1 }}>
              {step === 'review' ? 'Your places' : step === 'done' ? 'Added!' : 'Bring your places'}
            </Display>
            <Pressable onPress={close} accessibilityLabel="Close" hitSlop={8}>
              <Display s={18} c={C.inkMuted}>
                ×
              </Display>
            </Pressable>
          </View>

          {step === 'pick' ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30, gap: 12 }}>
              <Serif s={14} c={C.inkMuted} style={{ lineHeight: 20 }}>
                Already keep a list somewhere? Bring it — everything is read on this device, and you check every match before it’s added.
              </Serif>
              {problem ? (
                <Mono s={10} c={C.ink400}>
                  {problem}
                </Mono>
              ) : null}
              {SOURCES.map((s) => (
                <View key={s.id} accessibilityLabel={`Import from ${s.title}`} style={{ backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
                      <Banner s={13} c={C.inkDeep}>
                        {s.glyph}
                      </Banner>
                    </View>
                    <View style={{ flex: 1 }}>
                      <SerifDisplay s={16} c={C.inkDeep}>
                        {s.title}
                      </SerifDisplay>
                      <Mono s={8.5} c={C.inkMuted}>
                        {s.sub}
                      </Mono>
                    </View>
                  </View>
                  <Mono s={8.5} c={C.inkSoft} style={{ lineHeight: 13 }}>
                    {s.how}
                  </Mono>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {s.id === 'beli' && canFiles ? <Btn small label="Choose screenshots" a11y="Beli: choose screenshots" onPress={() => fromScreens('beli')} /> : null}
                    {s.id === 'google' && canFiles ? <Btn small label="Choose Takeout files" a11y="Google: choose files" onPress={() => fromFiles('google')} /> : null}
                    {s.id === 'photos' ? (
                      <Btn
                        small
                        label="Choose photos"
                        a11y="Photos: choose photos"
                        onPress={() => {
                          close();
                          openPhotoImport();
                        }}
                      />
                    ) : null}
                    {s.id === 'file' && canFiles ? <Btn small label="Choose a file" a11y="File: choose" onPress={() => fromFiles('file')} /> : null}
                    {s.id !== 'photos' && s.id !== 'file' ? (
                      <Btn
                        small
                        bg={s.id === 'notes' ? C.ink400 : C.paper0}
                        fg={s.id === 'notes' ? C.paper0 : C.inkDeep}
                        label={s.id === 'google' ? 'Paste links' : 'Paste a list'}
                        a11y={`${s.title}: paste`}
                        onPress={() => {
                          setSource(s.id);
                          setStep('paste');
                        }}
                      />
                    ) : null}
                    {s.id === 'notes' && canFiles ? <Btn small bg={C.paper0} fg={C.inkDeep} label="Choose a .txt" a11y="Notes: choose file" onPress={() => fromFiles('notes')} /> : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {step === 'paste' ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30, gap: 10 }}>
              <Serif s={13.5} c={C.inkMuted} style={{ lineHeight: 19 }}>
                {source === 'google'
                  ? 'Paste Google Maps links or shared places — one per line.'
                  : source === 'beli'
                    ? 'Paste your Beli list (or anything copied from it) — one place per line, scores welcome.'
                    : 'Paste your list — one place per line. Scores (9/10, 4.5/5, ★★★★) and headings (“Been”, “Want to try:”) are understood.'}
              </Serif>
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder={'Contramar — 9/10\nTaquería Orinoco ★★★★\nWant to try:\nPujol'}
                accessibilityLabel="List to import"
                style={{ minHeight: 220, textAlignVertical: 'top', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, padding: 12, fontSize: 14, color: C.inkDeep }}
              />
              <Btn label="Read my list" disabled={!text.trim()} onPress={fromText} />
            </ScrollView>
          ) : null}

          {step === 'reading' ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 60 }}>
              <ActivityIndicator color={C.ink400} />
              <Serif s={14} c={C.inkMuted}>
                {status}
              </Serif>
            </View>
          ) : null}

          {step === 'empty' ? (
            <View style={{ padding: 22, gap: 12 }}>
              <Serif s={15} c={C.inkDeep} style={{ lineHeight: 21 }}>
                We couldn’t find any places in that. Try screenshots where the names are visible, or paste the list as text.
              </Serif>
              <Btn label="Try another way" onPress={() => setStep('pick')} />
            </View>
          ) : null}

          {step === 'review' ? (
            <>
              <View style={{ paddingHorizontal: 18, gap: 8, paddingBottom: 8, borderBottomWidth: 2, borderColor: C.inkBlack }}>
                <Mono s={9.5} c={C.inkMuted}>
                  {rows.length} found · {counts.matched} matched to CRTQ · {counts.fresh} new to CRTQ{source ? ` · from ${SOURCE_LABEL[source]}` : ''}
                </Mono>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable onPress={() => setAll({ list: 'been' })} accessibilityLabel="Mark all Been" style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Banner s={8} tk={0.08} c={C.inkDeep}>
                      All Been
                    </Banner>
                  </Pressable>
                  <Pressable onPress={() => setAll({ list: 'want' })} accessibilityLabel="Mark all Want to try" style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Banner s={8} tk={0.08} c={C.inkDeep}>
                      All Want to try
                    </Banner>
                  </Pressable>
                  <Pressable onPress={() => setAll({ on: !rows.every((r) => r.on) })} accessibilityLabel="Select all or none" style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Banner s={8} tk={0.08} c={C.inkDeep}>
                      {rows.every((r) => r.on) ? 'Select none' : 'Select all'}
                    </Banner>
                  </Pressable>
                </View>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 20 }}>
                {rows.slice(0, shown).map((row) => {
                  const p = row.pick >= 0 && row.r.place ? (row.pick === 0 ? row.r.place : row.r.alts[row.pick - 1]) : null;
                  const options = row.r.place ? 1 + row.r.alts.length : row.r.alts.length;
                  const cycle = () => {
                    // best → alternatives → "new place" → best…
                    if (!row.r.place) return;
                    const next = row.pick + 1 > row.r.alts.length ? -1 : row.pick + 1;
                    setRow(row.key, { pick: next });
                  };
                  return (
                    <View key={row.key} accessibilityLabel={`Import row: ${row.r.entry.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1.5, borderColor: C.ink100, opacity: row.on ? 1 : 0.45 }}>
                      <Pressable onPress={() => setRow(row.key, { on: !row.on })} accessibilityLabel={`${row.on ? 'Skip' : 'Include'}: ${row.r.entry.name}`} hitSlop={6} style={{ width: 22, height: 22, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: row.on ? C.stampGreen : C.paper0, alignItems: 'center', justifyContent: 'center' }}>
                        {row.on ? (
                          <Banner s={10} c={C.paper0}>
                            ✓
                          </Banner>
                        ) : null}
                      </Pressable>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <SerifDisplay s={14.5} c={C.inkDeep} numberOfLines={1}>
                          {p ? p.name : row.r.entry.name}
                        </SerifDisplay>
                        <Pressable onPress={cycle} disabled={!row.r.place} accessibilityLabel={`Change match: ${row.r.entry.name}`} hitSlop={4}>
                          <Mono s={8.5} c={p ? (row.pick === 0 && row.r.confidence === 'sure' ? C.stampGreen : C.ink400) : C.inkMuted} numberOfLines={1}>
                            {p
                              ? `${row.pick === 0 && row.r.confidence === 'sure' ? '✓ Matched' : '? Best guess'}${p.hood ? ' · ' + p.hood : ''}${p.name !== row.r.entry.name ? ` · from “${row.r.entry.name}”` : ''}${options > 1 ? ' · tap to change' : ''}`
                              : row.r.place
                                ? '+ New to CRTQ (you chose) · tap to change'
                                : `+ New to CRTQ${row.r.entry.hood ? ' · ' + row.r.entry.hood : ''}`}
                          </Mono>
                        </Pressable>
                      </View>
                      {row.r.entry.score != null ? (
                        <View style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: C.sun100 }}>
                          <Banner s={9} c={C.inkDeep}>
                            {row.r.entry.score.toFixed(1)}
                          </Banner>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => setRow(row.key, { list: row.list === 'been' ? 'want' : 'been' })}
                        accessibilityLabel={`${row.list === 'been' ? 'Been' : 'Want to try'}: ${row.r.entry.name}`}
                        style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: row.list === 'been' ? C.inkDeep : C.paper0 }}
                      >
                        <Banner s={8} tk={0.06} c={row.list === 'been' ? C.paper0 : C.inkDeep}>
                          {row.list === 'been' ? 'Been' : 'Want'}
                        </Banner>
                      </Pressable>
                    </View>
                  );
                })}
                {rows.length > shown ? (
                  <Pressable onPress={() => setShown((n) => n + 200)} accessibilityLabel="Show more" style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Mono s={10} c={C.ink400}>
                      Show {Math.min(200, rows.length - shown)} more of {rows.length - shown}
                    </Mono>
                  </Pressable>
                ) : null}
              </ScrollView>
              <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 14, borderTopWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0 }}>
                <Btn label={counts.on ? `Add ${counts.on} · ${counts.been} been · ${counts.want} to try` : 'Nothing selected'} disabled={!counts.on} onPress={add} a11y="Add places" />
              </View>
            </>
          ) : null}

          {step === 'done' && result ? (
            <View style={{ padding: 22, gap: 14 }}>
              <Serif s={16} c={C.inkDeep} style={{ lineHeight: 23 }}>
                {result.been ? `${result.been} ${result.been === 1 ? 'place is' : 'places are'} on your Been list` : ''}
                {result.been && result.want ? ', and ' : ''}
                {result.want ? `${result.want} ${result.want === 1 ? 'is' : 'are'} saved to Want to try` : ''}
                {!result.been && !result.want ? 'Those were all already on your lists' : ''}.
              </Serif>
              <Mono s={9.5} c={C.inkMuted} style={{ lineHeight: 14 }}>
                Places without a score sit at a starting score until you rank them — tap one in your Guide to give it your verdict.
              </Mono>
              <Btn label="Done" onPress={close} />
              <Btn label="Bring more" bg={C.paper0} fg={C.inkDeep} onPress={() => setStep('pick')} />
            </View>
          ) : null}
        </View>
      </SheetUp>
    </View>
  );
}
