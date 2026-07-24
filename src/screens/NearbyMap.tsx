/**
 * Nearby map — one map for everything happening around you: restaurant
 * **Grades** (rated spots show their 0–10, fresh ones show price), community
 * **Events**, and open **Tables**, all plotted by real coordinates on the
 * brand's printed-paper map and toggled with one filter row. Tap a pin for the
 * detail card.
 */
import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { type City } from '../data/cities';
import { EVENTS, OPEN, EVENT_PHOTO, byId } from '../store/data';
import { PLACE_COORDS, PIN_COORDS, coordForId, type Pin } from '../data/geo';
import { scoreStyle, fmt, metaOf } from '../store/helpers';
import { C } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { MapSurface } from '../components/MapSurface';
import { ScreenIn } from '../components/Anim';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'grade', label: 'Grades' },
  { key: 'event', label: 'Events' },
  { key: 'table', label: 'Tables' },
];

function distanceMin(city: City, lat: number, lon: number): string {
  const R = 6371000;
  const dLat = ((lat - city.center.lat) * Math.PI) / 180;
  const dLon = ((lon - city.center.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((city.center.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const min = Math.round((2 * R * Math.asin(Math.sqrt(a))) / 80);
  if (min <= 2) return 'right here';
  if (min <= 25) return `~${min} min walk`;
  return `~${((2 * R * Math.asin(Math.sqrt(a))) / 1000).toFixed(1)} km`;
}

export function NearbyMap() {
  const insets = useSafeAreaInsets();
  const closeMap = useStore((s) => s.closeMap);
  const city = useStore((s) => s.city);
  const nearby = useStore((s) => s.nearby);
  const status = useStore((s) => s.nearbyStatus);
  const loadNearby = useStore((s) => s.loadNearby);
  const mapFilter = useStore((s) => s.mapFilter);
  const setMapFilter = useStore((s) => s.setMapFilter);
  const selPin = useStore((s) => s.selPin);
  const selectPin = useStore((s) => s.selectPin);
  const openPlace = useStore((s) => s.openPlace);
  const openEvent = useStore((s) => s.openEvent);
  const openCitySheet = useStore((s) => s.openCitySheet);
  const ranked = useStore((s) => s.ranked);
  const createdTables = useStore((s) => s.createdTables);

  const rankedScore: Record<string, number> = {};
  ranked.forEach((r) => {
    if (r.score != null) rankedScore[r.id] = r.score;
  });

  const pins: Pin[] = [];
  // GRADES — curated scored places
  Object.entries(PLACE_COORDS).forEach(([id, coord]) => {
    const p = byId[id];
    if (!p || p.critic == null || p.people == null) return;
    const overall = (p.critic + p.people) / 2;
    const ss = scoreStyle(overall);
    pins.push({ kind: 'grade', id, coord, bg: ss.bg, fg: ss.fg, metric: fmt(overall), dashed: true });
  });
  // GRADES — live nearby (ranked → score, else price)
  nearby.forEach((p) => {
    if (p.lat == null || p.lon == null) return;
    const r = rankedScore[p.id];
    if (r != null) {
      const ss = scoreStyle(r);
      pins.push({ kind: 'grade', id: p.id, coord: { lat: p.lat, lon: p.lon }, bg: ss.bg, fg: ss.fg, metric: fmt(r), dashed: true });
    } else {
      pins.push({ kind: 'grade', id: p.id, coord: { lat: p.lat, lon: p.lon }, bg: C.ink400, fg: C.paper0, metric: p.price, dashed: false });
    }
  });
  // EVENTS
  EVENTS.forEach((ev) => {
    const coord = PIN_COORDS[ev.id];
    if (coord) pins.push({ kind: 'event', id: ev.id, coord, bg: C.sun400, fg: C.inkDeep, metric: ev.d, dashed: false });
  });
  // TABLES (created + open)
  [...createdTables, ...OPEN].forEach((t: any) => {
    const coord = coordForId(t.id, t.placeId);
    if (coord) pins.push({ kind: 'table', id: t.id, coord, bg: C.stampBlue, fg: C.paper0, metric: t.d, dashed: false });
  });

  const visible = pins.filter((p) => mapFilter === 'all' || p.kind === mapFilter);

  return (
    <ScreenIn style={{ backgroundColor: C.paper50 }}>
      {/* header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 10, backgroundColor: C.paper50, borderBottomWidth: 2.5, borderColor: C.inkBlack }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={closeMap} style={{ paddingHorizontal: 4 }}>
            <Display s={20} c={C.ink400}>
              ←
            </Display>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={openCitySheet} hitSlop={6}>
            <Display s={24} c={C.inkDeep}>
              Nearby
            </Display>
            <Mono s={9.5} c={C.inkMuted} style={{ marginTop: 2 }} numberOfLines={1}>
              {city.flag} {city.name} · {city.defaultHood} · {city.weather} ▾
            </Mono>
          </Pressable>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={() => loadNearby()} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={15} c={C.ink400}>
                ↻
              </Display>
            </Pressable>
          </StickerView>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 2 }}>
          {FILTERS.map((f) => {
            const on = mapFilter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setMapFilter(f.key as any)} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: on ? C.ink400 : C.paper0 }}>
                <Banner s={10} tk={0.12} c={on ? C.paper0 : C.inkDeep}>
                  {f.label}
                </Banner>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <View style={{ justifyContent: 'center' }}>
            <Mono s={9} c={C.inkSoft}>
              {status === 'loading' ? 'loading…' : `${visible.length} pins`}
            </Mono>
          </View>
        </ScrollView>
      </View>

      {/* map surface */}
      <View style={{ flex: 1, backgroundColor: C.paper100, overflow: 'hidden' }}>
        <MapSurface pins={visible} city={city} selPin={selPin} onSelect={selectPin} />

        {/* legend */}
        <View style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 5 }}>
          <StickerView offset="sm" style={{ flexDirection: 'row', gap: 11, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: 7, paddingHorizontal: 11 }}>
            {[
              { c: C.stampGreen, l: 'Grades', dashed: true },
              { c: C.sun400, l: 'Events', dashed: false },
              { c: C.stampBlue, l: 'Tables', dashed: false },
            ].map((x) => (
              <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: x.c, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                  {x.dashed ? <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: C.paper0, borderStyle: 'dashed' }} /> : null}
                </View>
                <Mono s={9} c={C.inkMuted}>
                  {x.l}
                </Mono>
              </View>
            ))}
          </StickerView>
        </View>

        {status === 'loading' ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={C.ink400} />
              <Banner s={11} tk={0.14} c={C.inkDeep}>
                Reading the streets…
              </Banner>
            </StickerView>
          </View>
        ) : null}

        {selPin ? <SelectCard onEvent={openEvent} onPlace={openPlace} onClose={() => selectPin(null)} createdTables={createdTables} city={city} nearby={nearby} rankedScore={rankedScore} /> : null}
      </View>
    </ScreenIn>
  );
}

function SelectCard({
  onEvent,
  onPlace,
  onClose,
  createdTables,
  city,
  nearby,
  rankedScore,
}: {
  onEvent: (id: string) => void;
  onPlace: (id: string) => void;
  onClose: () => void;
  createdTables: any[];
  city: City;
  nearby: any[];
  rankedScore: Record<string, number>;
}) {
  const sel = useStore((s) => s.selPin)!;

  let content: { photo: string; name: string; meta: string; badge: string; badgeBg: string; badgeFg: string; walk: string; cta: string; onPress: () => void };

  if (sel.kind === 'event') {
    const ev = EVENTS.find((e) => e.id === sel.id)!;
    const left = ev.spots - ev.taken;
    const c = PIN_COORDS[ev.id];
    content = {
      photo: EVENT_PHOTO[ev.id] || 'chef-plating',
      name: ev.title,
      meta: `${ev.wd} ${ev.mo} ${ev.d} · ${ev.route}`,
      badge: left <= 0 ? 'Full · waitlist' : `${left} spots left`,
      badgeBg: left <= 0 ? C.stampPink : C.sun400,
      badgeFg: left <= 0 ? C.pinkFg : C.inkDeep,
      walk: c ? distanceMin(city, c.lat, c.lon) : '',
      cta: 'See event →',
      onPress: () => onEvent(ev.id),
    };
  } else if (sel.kind === 'table') {
    const t = [...createdTables, ...OPEN].find((x: any) => x.id === sel.id);
    const c = coordForId(t.id, t.placeId);
    content = {
      photo: t.photo || 'italian-deli',
      name: t.title,
      meta: t.host,
      badge: `${t.taken}/${t.spots} seats`,
      badgeBg: C.stampBlue,
      badgeFg: C.paper0,
      walk: c ? distanceMin(city, c.lat, c.lon) : '',
      cta: 'See table →',
      onPress: () => onEvent(t.id),
    };
  } else {
    const base = byId[sel.id] || nearby.find((p) => p.id === sel.id);
    const r = rankedScore[sel.id];
    const overall = base.critic != null && base.people != null ? (base.critic + base.people) / 2 : null;
    const shownScore = r != null ? r : overall;
    const ss = shownScore != null ? scoreStyle(shownScore) : { bg: C.ink400, fg: C.paper0 };
    const c = PLACE_COORDS[sel.id] || (base.lat != null ? { lat: base.lat, lon: base.lon } : null);
    content = {
      photo: base.photo,
      name: base.name,
      meta: metaOf(base),
      badge: shownScore != null ? `Grade ${fmt(shownScore)}` : base.price,
      badgeBg: shownScore != null ? ss.bg : C.sun400,
      badgeFg: shownScore != null ? ss.fg : C.inkDeep,
      walk: c ? distanceMin(city, c.lat, c.lon) : '',
      cta: 'See place →',
      onPress: () => onPlace(sel.id),
    };
  }

  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 25 }}>
      <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
        <Photo source={photo(content.photo)} style={{ width: 56, height: 56, borderWidth: 2, borderColor: C.inkBlack }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <SerifDisplay s={16} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 16 }}>
            {content.name}
          </SerifDisplay>
          <Mono s={9} c={C.inkMuted} numberOfLines={1} style={{ marginTop: 3 }}>
            {content.meta}
          </Mono>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: content.badgeBg }}>
              <Banner s={9} tk={0.08} c={content.badgeFg}>
                {content.badge}
              </Banner>
            </View>
            {content.walk ? (
              <Mono s={9} c={C.inkSoft}>
                {content.walk}
              </Mono>
            ) : null}
          </View>
        </View>
        <StickerPressable offset="sm" radius={999} onPress={content.onPress} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 9, paddingHorizontal: 12 }}>
          <Banner s={10} tk={0.1} c={C.paper0}>
            {content.cta}
          </Banner>
        </StickerPressable>
        <View style={{ position: 'absolute', top: -10, right: -8 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={onClose} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={12} c={C.ink400}>
                ✕
              </Display>
            </Pressable>
          </StickerView>
        </View>
      </StickerView>
    </View>
  );
}
