/**
 * Fresh finds — a different handful of spots every time you open the app:
 * new on the map, in the news, or found by another diner (spots.ts +
 * discover.ts). Tap to open, ♡ to save for later, ✕ for "not for me" (it never
 * comes back). "Near me" re-ranks around where you are (asks first). Ends with
 * "Tell us about a spot", which reaches everyone after the next sweep.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Modal, TextInput, Platform } from 'react-native';
import { useStore, registerPlaces } from '../store/useStore';
import { loadSpotFeed, spotToPlace, spotReason, daysAgo, type Spot } from '../data/spots';
import { discover, likesFrom, loadMemory, saveMemory, markShown, emptyMemory, type DiscoverMemory } from '../data/discover';
import { computePalate } from '../data/palate';
import { onEachUse } from '../data/live';
import { suggestSpot, currentSession } from '../data/cloud';
import { C } from '../theme/tokens';
import { Banner, Mono, SerifDisplay, Serif } from './Text';
import { StickerPressable } from './Sticker';
import { PlaceCover } from './Cover';

function SpotCard({ s, onOpen, onSave, onDismiss, saved }: { s: Spot; onOpen: () => void; onSave: () => void; onDismiss: () => void; saved: boolean }) {
  const place = useMemo(() => spotToPlace(s), [s]);
  const tone = s.sug ? C.stampGreen : s.buzz?.length ? C.ink400 : C.stampBlue;
  return (
    <StickerPressable offset="sm" onPress={onOpen} accessibilityLabel={`Fresh find: ${s.n}`} style={{ width: 172, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <PlaceCover place={place} photoUrl={s.img} credit={s.img ? s.imgSrc : undefined} style={{ width: '100%', height: 104, borderBottomWidth: 2, borderColor: C.inkBlack }} crestSize={34} darken={0.12} />
      <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: tone, borderWidth: 1.5, borderColor: C.inkBlack, paddingVertical: 2, paddingHorizontal: 6, maxWidth: 158, transform: [{ rotate: '-2deg' }] }}>
        <Banner s={7.5} tk={0.06} c={C.paper0} numberOfLines={1}>
          {spotReason(s)}
        </Banner>
      </View>
      <View style={{ padding: 9, gap: 3 }}>
        <SerifDisplay s={14.5} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
          {s.n}
        </SerifDisplay>
        <Mono s={8} c={C.inkMuted} numberOfLines={1}>
          {[s.c?.[0] ? s.c[0].replace(/\b\w/g, (m) => m.toUpperCase()) : s.k, s.h].filter(Boolean).join(' · ')}
        </Mono>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
          <Pressable onPress={onSave} accessibilityLabel={`${saved ? 'Saved' : 'Save'}: ${s.n}`} hitSlop={6} style={{ flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, backgroundColor: saved ? C.sun400 : C.paper0 }}>
            <Banner s={8} tk={0.08} c={C.inkDeep}>
              {saved ? '♥ Saved' : '♡ Save'}
            </Banner>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityLabel={`Not for me: ${s.n}`} hitSlop={6} style={{ alignItems: 'center', borderWidth: 1.5, borderColor: C.inkSoft, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Banner s={8} c={C.inkMuted}>
              ✕
            </Banner>
          </Pressable>
        </View>
      </View>
    </StickerPressable>
  );
}

function SuggestSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [where, setWhere] = useState<{ lat: number; lon: number } | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const canSend = !!currentSession();
  const locate = () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setWhere({ lat: p.coords.latitude, lon: p.coords.longitude }), () => setWhere(null), { timeout: 10000 });
  };
  const send = async () => {
    if (name.trim().length < 2 || state === 'sending') return;
    setState('sending');
    const ok = await suggestSpot({ kind: 'new', name: name.trim(), link: link.trim() || undefined, note: note.trim() || undefined, lat: where?.lat, lon: where?.lon, handle: profile?.handle, cityId: 'cdmx' });
    setState(ok ? 'sent' : 'failed');
  };
  const field = { borderWidth: 1.5, borderColor: C.inkSoft, padding: 9, fontSize: 14, color: C.inkDeep, backgroundColor: C.paper0 } as const;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,12,4,0.55)', justifyContent: 'flex-end' }}>
        <View accessibilityLabel="Tell us about a spot" style={{ backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, padding: 18, gap: 10 }}>
          <Banner s={12} tk={0.14} c={C.inkDeep}>
            Tell us about a spot
          </Banner>
          {state === 'sent' ? (
            <Serif s={14} c={C.inkDeep} style={{ lineHeight: 20 }}>
              Thank you — it’s in. It reaches everyone’s Fresh finds after the next city sweep.
            </Serif>
          ) : (
            <>
              <Serif s={13} c={C.inkMuted} style={{ lineHeight: 18 }}>
                A new opening, a stall nobody knows, a place we’re missing. It goes to everyone’s Fresh finds after the next sweep.
              </Serif>
              <TextInput value={name} onChangeText={setName} placeholder="Its name" maxLength={120} accessibilityLabel="Spot name" style={field} />
              <TextInput value={link} onChangeText={setLink} placeholder="Instagram, website or map link (optional)" maxLength={300} autoCapitalize="none" accessibilityLabel="Spot link" style={field} />
              <TextInput value={note} onChangeText={setNote} placeholder="What should people order? (optional)" maxLength={500} multiline accessibilityLabel="Spot note" style={[field, { minHeight: 54 }]} />
              <Pressable onPress={locate} accessibilityLabel="I'm there now" hitSlop={6}>
                <Mono s={9.5} c={where ? C.stampGreen : C.ink400}>
                  {where ? '● Location added — you’re there' : '◎ I’m there right now (adds the location)'}
                </Mono>
              </Pressable>
              {!canSend ? (
                <Mono s={9} c={C.ink400}>
                  Sending needs the trial server, which isn’t reachable right now — try again later.
                </Mono>
              ) : state === 'failed' ? (
                <Mono s={9} c={C.ink400}>
                  Couldn’t send — try again in a bit.
                </Mono>
              ) : null}
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {state !== 'sent' ? (
              <StickerPressable offset="sm" radius={999} onPress={send} accessibilityLabel="Send spot" style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: canSend && name.trim().length >= 2 ? C.sun400 : C.paper100, paddingVertical: 8, paddingHorizontal: 16 }}>
                <Banner s={10} tk={0.1} c={C.inkDeep}>
                  {state === 'sending' ? 'Sending…' : 'Send'}
                </Banner>
              </StickerPressable>
            ) : null}
            <StickerPressable offset="sm" radius={999} onPress={onClose} accessibilityLabel="Close" style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, paddingVertical: 8, paddingHorizontal: 16 }}>
              <Banner s={10} tk={0.1} c={C.inkMuted}>
                {state === 'sent' ? 'Done' : 'Cancel'}
              </Banner>
            </StickerPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function FreshFinds() {
  const openPlace = useStore((s) => s.openPlace);
  const toggleWant = useStore((s) => s.toggleWant);
  const ranked = useStore((s) => s.ranked);
  const wantIds = useStore((s) => s.wantIds);
  const saved = useStore((s) => s.saved);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const profile = useStore((s) => s.profile);
  const [feed, setFeed] = useState<{ spots: Spot[]; at: string } | null>(null);
  const [mem, setMem] = useState<DiscoverMemory>(emptyMemory());
  const [memReady, setMemReady] = useState(false);
  const [visit, setVisit] = useState(0); // bumps on each use → a new hand
  const [near, setNear] = useState<{ lat: number; lon: number } | null>(null);
  const [suggest, setSuggest] = useState(false);

  useEffect(() => {
    loadMemory().then((m) => {
      setMem(m);
      setMemReady(true);
    });
    return onEachUse(() => {
      loadSpotFeed().then((f) => {
        if (!f) return;
        registerPlaces(f.spots.map(spotToPlace)); // saved / ranked spots resolve on every screen
        setFeed({ spots: f.spots, at: f.generated_at });
      });
      setVisit((v) => v + 1);
    });
  }, []);

  // The hand for this visit: computed once per visit (and when "near me" changes),
  // so saving or dismissing doesn't reshuffle what you're looking at.
  const likes = useMemo(() => likesFrom(tastes, computePalate(ranked, tastes, userReviews).topCuisines), [tastes, ranked, userReviews]);
  const handRef = useRef<{ key: string; spots: Spot[]; radiusKm: number | null; recycled: boolean } | null>(null);
  const key = `${visit}|${feed?.at}|${near ? near.lat.toFixed(3) : ''}|${memReady}`;
  if (feed && memReady && handRef.current?.key !== key) {
    const exclude = new Set([...ranked.map((p) => p.id), ...wantIds]);
    const r = discover(feed.spots, { seed: profile?.handle || 'guest', exclude, likes, at: near, memory: mem }, 12);
    handRef.current = { key, ...r };
  }
  const hand = handRef.current;

  // Count this showing once per hand (fatigue → next visit brings new spots).
  const shownKey = useRef('');
  useEffect(() => {
    if (!hand || !hand.spots.length || shownKey.current === hand.key) return;
    shownKey.current = hand.key;
    setMem((m) => {
      const next = markShown(m, hand.spots.map((s) => s.id));
      void saveMemory(next);
      return next;
    });
  }, [hand]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  if (!feed || !hand) return null;
  const list = hand.spots.filter((s) => !hidden.has(s.id));

  const open = (s: Spot) => {
    registerPlaces([spotToPlace(s)]);
    setMem((m) => {
      const next = { ...m, opened: { ...m.opened, [s.id]: Date.now() } };
      void saveMemory(next);
      return next;
    });
    openPlace(s.id);
  };
  const dismiss = (s: Spot) => {
    setHidden((h) => new Set(h).add(s.id));
    setMem((m) => {
      const next = { ...m, dismissed: [...m.dismissed, s.id] };
      void saveMemory(next);
      return next;
    });
  };
  const save = (s: Spot) => {
    registerPlaces([spotToPlace(s)]);
    toggleWant(s.id);
  };
  const nearMe = () => {
    if (near) return setNear(null);
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setNear({ lat: p.coords.latitude, lon: p.coords.longitude }), () => setNear(null), { timeout: 10000 });
  };
  const age = daysAgo(feed.at);

  return (
    <View accessibilityLabel="Fresh finds">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <Banner s={11} tk={0.14} c={C.inkDeep}>
          Fresh finds
        </Banner>
        <Pressable onPress={nearMe} accessibilityLabel={near ? 'Whole city' : 'Near me'} hitSlop={8} style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9, backgroundColor: near ? C.inkDeep : C.paper0 }}>
          <Banner s={8} tk={0.08} c={near ? C.paper0 : C.inkDeep}>
            {near ? '◉ Near me' : '◎ Near me'}
          </Banner>
        </Pressable>
      </View>
      <Mono s={8.5} c={C.inkSoft} style={{ marginBottom: 8 }}>
        New on the map, in the news, found by diners · swept {age == null ? 'recently' : age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`}
        {hand.radiusKm ? ` · within ${hand.radiusKm} km` : ''}
        {hand.recycled ? ' · you’ve seen them all — here they are again' : ''}
      </Mono>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingRight: 4 }}>
        {list.map((s) => (
          <SpotCard key={s.id} s={s} saved={wantIds.includes(s.id) || !!saved[s.id]} onOpen={() => open(s)} onSave={() => save(s)} onDismiss={() => dismiss(s)} />
        ))}
        <StickerPressable offset="sm" onPress={() => setSuggest(true)} accessibilityLabel="Tell us about a spot" style={{ width: 150, backgroundColor: C.sun100, borderWidth: 2.5, borderColor: C.inkBlack, borderStyle: 'dashed', padding: 12, justifyContent: 'center', gap: 6 }}>
          <Banner s={22} c={C.ink400}>
            +
          </Banner>
          <SerifDisplay s={14} c={C.inkDeep} style={{ lineHeight: 17 }}>
            Know a spot we don’t?
          </SerifDisplay>
          <Mono s={8} c={C.inkMuted}>
            Tell us — everyone sees it after the next sweep.
          </Mono>
        </StickerPressable>
      </ScrollView>
      <Mono s={7} c={C.inkSoft} style={{ marginTop: 4 }}>
        Map data © OpenStreetMap contributors · headlines via Google News
      </Mono>
      {suggest ? <SuggestSheet onClose={() => setSuggest(false)} /> : null}
    </View>
  );
}
