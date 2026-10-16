/**
 * "Can't decide?" — a swipe deck that deals you restaurants that fit your
 * taste, one card at a time, best match first.
 *
 *   swipe right / ✓  → "¡Vamos hoy!": today's table (a passport-style entry stamp)
 *   swipe left  / ✕  → "Hoy no": next card
 *   "Maybe, save for later" → saved to your want-to-try
 *
 * Arrow keys work on the web (→ go, ← skip, ↓ maybe, Backspace undo). The
 * deck, today's pick and undo live in the store (data/decide.ts), so it carries
 * on where you left it for the rest of the day.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Animated, PanResponder, Platform, Linking, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { computePalate } from '../data/palate';
import { dealDeck, forToday, type DeckCard, type DecideAction } from '../data/decide';
import { staticCover } from '../data/media';
import { guideBadgeOf } from '../data/chefs';
import { C } from '../theme/tokens';
import { BRAND } from '../assets';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { PlaceCover } from '../components/Cover';
import { Monogram } from '../components/Monogram';
import { PapelPicado } from '../components/PapelPicado';
import { Grain } from '../components/Grain';
import { SimTag } from '../components/CriticMarks';
import { CrossIcon, CheckIcon, UndoIcon, BookmarkIcon } from '../components/icons';

const SWIPE = 110; // px past which a release counts as a decision

/** A rubber stamp, the passport's visual language for a decision. */
function Stamp({ text, sub, color, rot, style }: { text: string; sub?: string; color: string; rot: string; style?: object }) {
  return (
    <View style={[{ borderWidth: 4, borderColor: color, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12, alignItems: 'center', backgroundColor: 'rgba(255,253,245,0.86)', transform: [{ rotate: rot }] }, style]}>
      <Display s={26} c={color} style={{ letterSpacing: 1 }}>
        {text}
      </Display>
      {sub ? (
        <Banner s={8} tk={0.2} c={color}>
          {sub}
        </Banner>
      ) : null}
    </View>
  );
}

/** Five dots: how well it fits you, scaled across everything you could be dealt. */
function FitMeter({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: i <= level ? C.ink400 : C.paper0 }} />
      ))}
    </View>
  );
}

function CardFace({ card, onDetails }: { card: DeckCard; onDetails?: () => void }) {
  const t = useT();
  const p = card.place;
  const pic = staticCover(p);
  const badge = guideBadgeOf(p);
  const reason = card.reasons[0] ? t(card.reasons[0].key).replace('{x}', card.reasons[0].arg || '') : '';
  const meta = [p.category || p.cuisine, p.hood, p.price, p.ticketMid ? `~$${p.ticketMid} MXN pp` : ''].filter(Boolean).join(' · ');
  return (
    <View style={{ flex: 1, backgroundColor: C.paper0, borderWidth: 3, borderColor: C.inkBlack, overflow: 'hidden' }}>
      <View style={{ flex: 1.05, minHeight: 150 }}>
        <PlaceCover place={p} photoUrl={pic?.url} credit={pic?.credit.replace(/^Photo:\s*/, '')} style={{ width: '100%', height: '100%' }} crestSize={64} darken={0.18} />
        {/* a clear layer over the photo, so a desktop drag swipes the card instead of dragging the image */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {badge ? (
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 3, paddingHorizontal: 9, transform: [{ rotate: '-3deg' }] }}>
            <Banner s={9} tk={0.1} c={C.inkDeep}>
              {badge}
            </Banner>
          </View>
        ) : null}
        {/* rank sticker */}
        <View style={{ position: 'absolute', top: 10, right: 10, width: 70, height: 70, borderRadius: 35, backgroundColor: C.ink400, borderWidth: 3, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] }}>
          <Display s={card.rank > 99 ? 17 : 22} c={C.paper0} style={{ lineHeight: 24 }}>
            #{card.rank}
          </Display>
          <Banner s={7} tk={0.14} c={C.sun300}>
            FOR YOU
          </Banner>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 8, borderTopWidth: 3, borderColor: C.inkBlack }}>
        <View>
          <SerifDisplay s={27} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 30 }}>
            {p.name}
          </SerifDisplay>
          <Mono s={9.5} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
            {meta}
          </Mono>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Banner s={8.5} tk={0.14} c={C.inkSoft}>
            Your match
          </Banner>
          <FitMeter level={card.level} />
          {reason ? (
            <Mono s={9} c={C.ink400} numberOfLines={1} style={{ flexShrink: 1 }}>
              {reason}
            </Mono>
          ) : null}
        </View>
        {card.dish ? (
          <Serif s={13} c={C.inkDeep} numberOfLines={1}>
            <Banner s={8.5} tk={0.14} c={C.inkSoft}>
              ORDER{'  '}
            </Banner>
            {card.dish}
          </Serif>
        ) : null}
        {card.critic ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.sun100, borderWidth: 1.5, borderColor: C.inkBlack, padding: 7 }}>
            <Monogram name={card.critic.critic.name} size={26} />
            <SerifItalic s={11.5} c={C.inkDeep} numberOfLines={2} style={{ flex: 1, lineHeight: 15 }}>
              {card.critic.critic.name}: {card.critic.take.kind === 'clip' ? `“${card.critic.take.quote}”` : card.critic.take.quote}
            </SerifItalic>
            <SimTag />
          </View>
        ) : null}
        {onDetails ? (
          <Pressable onPress={onDetails} accessibilityLabel={`More about ${p.name}`} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Mono s={9} c={C.ink400}>
              More about it →
            </Mono>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** "It's a date" — the passport entry stamp for today's table. */
function TodayStamp({ card, onClose, onOpen }: { card: DeckCard; onClose: () => void; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }).start();
  }, [pop]);
  const p = card.place;
  const date = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
  const maps = p.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.hood)}`;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: 'rgba(27,16,4,0.82)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Animated.View style={{ width: '100%', maxWidth: 360, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '-1.5deg'] }) }] }}>
        <StickerView offset="lg" style={{ backgroundColor: C.sun400, borderWidth: 3, borderColor: C.inkBlack, overflow: 'hidden' }}>
          <Grain opacity={0.08} />
          <View style={{ padding: 18, alignItems: 'center', gap: 10 }}>
            <Image source={BRAND.logo} style={{ width: 54, height: 54, transform: [{ rotate: '-8deg' }] }} contentFit="contain" />
            <Banner s={10} tk={0.24} c={C.inkDeep}>
              ¡Mesa para hoy!
            </Banner>
            <Display s={30} c={C.inkDeep} style={{ textAlign: 'center', lineHeight: 32 }} numberOfLines={2}>
              {p.name}
            </Display>
            <Mono s={9.5} c={C.ink700} numberOfLines={1}>
              {[p.hood, p.price, p.openInfo].filter(Boolean).join(' · ')}
            </Mono>
            <Stamp text="¡VAMOS HOY!" sub={`ENTRADA · ${date} · CDMX`} color={C.stampGreen} rot="-6deg" style={{ marginVertical: 6 }} />
            <StickerPressable offset="sm" radius={999} onPress={onOpen} accessibilityLabel={`See ${p.name}`} style={{ alignSelf: 'stretch', alignItems: 'center', backgroundColor: C.ink400, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 12 }}>
              <Banner s={11} tk={0.1} c={C.paper0}>
                See the restaurant
              </Banner>
            </StickerPressable>
            <StickerPressable offset="sm" radius={999} onPress={() => Linking.openURL(maps)} accessibilityLabel="Get directions" style={{ alignSelf: 'stretch', alignItems: 'center', backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 11 }}>
              <Banner s={10.5} tk={0.1} c={C.inkDeep}>
                Get directions ↗
              </Banner>
            </StickerPressable>
            <Pressable onPress={onClose} accessibilityLabel="Keep swiping" hitSlop={8} style={{ paddingTop: 4 }}>
              <Mono s={10} c={C.ink700}>
                Keep swiping
              </Mono>
            </Pressable>
          </View>
        </StickerView>
      </Animated.View>
    </View>
  );
}

/** A card that fills its slot, with the brand's hard offset shadow. */
function FullSticker({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', top: 7, left: 7, right: -7, bottom: -7, backgroundColor: C.inkBlack, opacity: 0.85 }} />
      {children}
    </View>
  );
}

function RoundButton({ label, caption, onPress, bg, size, children }: { label: string; caption: string; onPress: () => void; bg: string; size: number; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <StickerPressable offset="sm" radius={999} onPress={onPress} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 3, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </StickerPressable>
      <Banner s={8.5} tk={0.12} c={C.inkDeep}>
        {caption}
      </Banner>
    </View>
  );
}

export function Decide() {
  const insets = useSafeAreaInsets();
  const close = useStore((s) => s.closeDecide);
  const openPlace = useStore((s) => s.openPlace);
  const decideAct = useStore((s) => s.decideAct);
  const decideUndo = useStore((s) => s.decideUndo);
  const decideReshuffle = useStore((s) => s.decideReshuffle);
  const setLogSeg = useStore((s) => s.setLogSeg);
  const go = useStore((s) => s.go);
  const decide = useStore((s) => forToday(s.decide));
  const nearby = useStore((s) => s.nearby);
  const nearbyById = useStore((s) => s.nearbyById);
  const ranked = useStore((s) => s.ranked);
  const tastes = useStore((s) => s.tastes);
  const userReviews = useStore((s) => s.userReviews);
  const [wantAtOpen] = useState(() => useStore.getState().wantIds);
  const [stage, setStage] = useState({ w: 360, h: 520 });
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const palate = useMemo(() => computePalate(ranked, tastes, userReviews), [ranked, tastes, userReviews]);
  // The whole deal, in a stable order; swiped cards are filtered out below (so undo puts one back in place).
  const deal = useMemo(
    () => dealDeck(nearby, { palate, tastes, beenIds: new Set(ranked.map((r) => r.id)), wantIds: new Set(wantAtOpen), seen: new Set() }, 60),
    [nearby, palate, tastes, ranked, wantAtOpen],
  );
  const seen = new Set(decide.seen);
  const deck = deal.filter((c) => !seen.has(c.place.id));
  const top = deck[0];
  const next = deck[1];
  const done = deal.length - deck.length;
  const pickCard = decide.pick ? deal.find((c) => c.place.id === decide.pick) : undefined;
  const pickName = decide.pick ? (pickCard?.place.name ?? nearbyById[decide.pick]?.name) : undefined;

  // ── the swipe ──
  const pos = useRef(new Animated.ValueXY()).current;
  const fade = useRef(new Animated.Value(1)).current;
  const later = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const topRef = useRef<DeckCard | undefined>(top);
  topRef.current = top;

  // A new top card always starts centred and visible.
  useEffect(() => {
    pos.setValue({ x: 0, y: 0 });
    later.setValue(0);
    fade.setValue(1);
    busy.current = false;
  }, [top?.place.id, pos, fade, later]);

  const decideNow = (action: DecideAction) => {
    const card = topRef.current;
    if (!card || busy.current) return;
    busy.current = true;
    const W = stage.w * 1.5;
    const to = action === 'go' ? { x: W, y: 40 } : action === 'skip' ? { x: -W, y: 40 } : { x: 0, y: -stage.h * 1.2 };
    const run = () =>
      Animated.timing(pos, { toValue: to, duration: action === 'later' ? 360 : 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(() => {
        fade.setValue(0);
        decideAct(card.place.id, action);
        if (action === 'go') setCelebrate(card.place.id);
      });
    if (action === 'later') Animated.timing(later, { toValue: 1, duration: 180, useNativeDriver: false }).start(run);
    else run();
  };
  const decideRef = useRef(decideNow);
  decideRef.current = decideNow;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10,
        onPanResponderGrant: () => undefined,
        onPanResponderMove: (_, g) => {
          if (!busy.current) pos.setValue({ x: g.dx, y: g.dy * 0.35 });
        },
        onPanResponderRelease: (_, g) => {
          if (busy.current) return;
          if (g.dx > SWIPE || g.vx > 0.7) decideRef.current('go');
          else if (g.dx < -SWIPE || g.vx < -0.7) decideRef.current('skip');
          else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [pos],
  );

  // Keyboard on the web: → go, ← skip, ↓ maybe, Backspace undo.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (celebrate) return;
      if (e.key === 'ArrowRight') decideRef.current('go');
      else if (e.key === 'ArrowLeft') decideRef.current('skip');
      else if (e.key === 'ArrowDown') decideRef.current('later');
      else if (e.key === 'Backspace') decideUndo();
    };
    const d = (globalThis as any).document;
    d?.addEventListener('keydown', onKey);
    return () => d?.removeEventListener('keydown', onKey);
  }, [celebrate, decideUndo]);

  const W = stage.w || 360;
  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-16deg', '0deg', '16deg'] });
  const goOpacity = pos.x.interpolate({ inputRange: [15, SWIPE], outputRange: [0, 1], extrapolate: 'clamp' });
  const noOpacity = pos.x.interpolate({ inputRange: [-SWIPE, -15], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({ inputRange: [-W, -SWIPE, 0, SWIPE, W], outputRange: [1, 1, 0.94, 1, 1], extrapolate: 'clamp' });
  const goGlow = pos.x.interpolate({ inputRange: [0, SWIPE], outputRange: [0, 1], extrapolate: 'clamp' });
  const noGlow = pos.x.interpolate({ inputRange: [-SWIPE, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const celebrateCard = celebrate ? deal.find((c) => c.place.id === celebrate) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.sun400 }}>
      <Grain opacity={0.07} />
      {/* papel picado cut from your palate */}
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top - 6, left: 0, right: 0, opacity: 0.9 }}>
        <PapelPicado palate={palate} seed={'decide' + decide.day} width={Math.max(320, W + 40)} height={46} hole={C.sun400} flags={7} />
      </View>

      {/* header */}
      <View style={{ paddingTop: insets.top + 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StickerPressable offset="sm" radius={999} onPress={close} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
          <Display s={18} c={C.ink400}>
            ←
          </Display>
        </StickerPressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={8.5} tk={0.2} c={C.ink700}>
            ¿No te decides?
          </Banner>
          <Display s={24} c={C.inkDeep} style={{ lineHeight: 26 }}>
            Can't decide?
          </Display>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={decideUndo}
          disabled={!decide.history.length}
          accessibilityLabel="Undo last swipe"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', opacity: decide.history.length ? 1 : 0.4 }}
        >
          <UndoIcon size={17} />
        </StickerPressable>
      </View>

      {/* how it works, in one line */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 16 }}>
        <Banner s={8.5} tk={0.12} c={C.ink700}>
          ← Not today
        </Banner>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink700 }} />
        <Mono s={8.5} c={C.ink700}>
          {deal.length ? `${Math.min(done + 1, deal.length)} of ${deal.length}` : ''}
        </Mono>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink700 }} />
        <Banner s={8.5} tk={0.12} c={C.stampGreen}>
          Let's go today →
        </Banner>
      </View>
      {pickName && !celebrate ? (
        <Pressable onPress={() => decide.pick && openPlace(decide.pick)} accessibilityLabel={`Today's table: ${pickName}`} style={{ alignSelf: 'center', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
          <CheckIcon size={11} />
          <Banner s={8.5} tk={0.08} c={C.paper0} numberOfLines={1}>
            Today's table: {pickName}
          </Banner>
        </Pressable>
      ) : null}

      {/* the stack */}
      <View style={{ flex: 1, marginTop: 12, marginLeft: 16, marginRight: 22, marginBottom: 6 }} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {top ? (
          <>
            {next ? (
              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ scale: nextScale }, { rotate: '-2.5deg' }] }}>
                <FullSticker>
                  <CardFace card={next} />
                </FullSticker>
              </Animated.View>
            ) : null}
            <Animated.View
              key={top.place.id}
              {...pan.panHandlers}
              accessibilityLabel={`Card: ${top.place.name}`}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade, transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }], ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object) : null) }}
            >
              <FullSticker>
                <CardFace card={top} onDetails={() => openPlace(top.place.id)} />
              </FullSticker>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '17%', left: 18, opacity: goOpacity }}>
                <Stamp text="¡VAMOS!" sub="HOY · TODAY" color={C.stampGreen} rot="-14deg" />
              </Animated.View>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '17%', right: 18, opacity: noOpacity }}>
                <Stamp text="HOY NO" sub="NOT TODAY" color={C.ink400} rot="13deg" />
              </Animated.View>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '32%', left: 0, right: 0, alignItems: 'center', opacity: later, transform: [{ scale: later.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] }}>
                <Stamp text="LUEGO" sub="SAVED FOR LATER" color={C.sun700} rot="-4deg" />
              </Animated.View>
            </Animated.View>
          </>
        ) : (
          <FullSticker>
          <View style={{ flex: 1, backgroundColor: C.paper0, borderWidth: 3, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
            <Image source={BRAND.logo} style={{ width: 84, height: 84, transform: [{ rotate: '-8deg' }] }} contentFit="contain" />
            <Display s={22} c={C.inkDeep} style={{ textAlign: 'center' }}>
              {deal.length ? 'That’s the whole deck' : 'Finding your tables…'}
            </Display>
            <Serif s={13.5} c={C.inkMuted} style={{ textAlign: 'center', lineHeight: 19 }}>
              {deal.length
                ? pickName
                  ? `Today’s table is ${pickName}. Shuffle to look again, or check what you saved for later.`
                  : 'You’ve seen every table we’d deal you today. Shuffle to look again, or check what you saved for later.'
                : 'Restaurants nearby are still loading.'}
            </Serif>
            {deal.length ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <StickerPressable offset="sm" radius={999} onPress={decideReshuffle} accessibilityLabel="Shuffle again" style={{ backgroundColor: C.ink400, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Banner s={10} tk={0.1} c={C.paper0}>
                    Shuffle again
                  </Banner>
                </StickerPressable>
                <StickerPressable
                  offset="sm"
                  radius={999}
                  onPress={() => {
                    setLogSeg('want');
                    go('log');
                  }}
                  accessibilityLabel="See saved for later"
                  style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}
                >
                  <Banner s={10} tk={0.1} c={C.inkDeep}>
                    Saved for later
                  </Banner>
                </StickerPressable>
              </View>
            ) : null}
          </View>
          </FullSticker>
        )}
      </View>

      {/* decisions */}
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 16, gap: 14, opacity: top ? 1 : 0.35 }} pointerEvents={top ? 'auto' : 'none'}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 44 }}>
          <Animated.View style={{ transform: [{ scale: noGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
            <RoundButton label="Not today" caption="Not today" onPress={() => decideNow('skip')} bg={C.paper0} size={68}>
              <CrossIcon size={28} color={C.ink400} sw={3.4} />
            </RoundButton>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: goGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
            <RoundButton label="Let's go today" caption="Let's go!" onPress={() => decideNow('go')} bg={C.stampGreen} size={68}>
              <CheckIcon size={30} color={C.paper0} sw={3.4} />
            </RoundButton>
          </Animated.View>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => decideNow('later')}
          accessibilityLabel="Maybe, save for later"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 12 }}
        >
          <BookmarkIcon size={15} color={C.inkDeep} sw={2.4} />
          <Banner s={11} tk={0.08} c={C.inkDeep}>
            Maybe, save for later
          </Banner>
        </StickerPressable>
      </View>

      {celebrateCard ? (
        <TodayStamp
          card={celebrateCard}
          onClose={() => setCelebrate(null)}
          onOpen={() => {
            setCelebrate(null);
            openPlace(celebrateCard.place.id);
          }}
        />
      ) : null}
    </View>
  );
}
