/**
 * A person's map of reviews — a critic's takes, a house critic's ranking, a
 * diner's favourites, your own list — on one map you can sift:
 *
 *  - where: their cities (when they rank in more than one);
 *  - what: their categories, each with its count — tap one to see the options
 *    it holds, numbered in their order (#1 is their best there);
 *  - options: their top 10 or everything, pins showing the score or the rank;
 *  - tap a pin (or an option below) for the place, then open it.
 *
 * The map frames whatever is showing. Places they've listed without a location
 * are counted, not dropped silently.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import type { Place } from '../store/data';
import type { Pin } from '../data/geo';
import type { City } from '../data/cities';
import { useStore } from '../store/useStore';
import { C } from '../theme/tokens';
import { Banner, Display, Mono, Serif } from './Text';
import { StickerPressable } from './Sticker';
import { Monogram } from './Monogram';
import { MapSurface } from './MapSurface';

export type MapReview = {
  place: Place;
  score?: number; // 0–10, when they score
  cat: string; // category id
  scope?: string; // city key, when they rank in several
  note?: string; // their words
};

type Opt = { id: string; label: string };

/** A pin's colours by score: a rave in vermillion, a recommendation in green, the rest on paper. */
const tone = (s?: number) => (s == null ? { bg: C.sun400, fg: C.inkDeep } : s >= 8.6 ? { bg: C.ink400, fg: C.paper0 } : s >= 7.9 ? { bg: C.stampGreen, fg: C.paper0 } : { bg: C.paper0, fg: C.inkDeep });

/** A "city" that is just the pins' bounds, so any map frames them. */
function boundsCity(ps: Place[]): City {
  const la = ps.map((p) => p.lat!), lo = ps.map((p) => p.lon!);
  const s = Math.min(...la), n = Math.max(...la), w = Math.min(...lo), e = Math.max(...lo);
  const pad = Math.max(0.004, (n - s) * 0.12, (e - w) * 0.12);
  return {
    id: 'reviews',
    name: 'Their map',
    country: 'MX',
    flag: '',
    center: { lat: (s + n) / 2, lon: (w + e) / 2 },
    bbox: [s - pad, w - pad, n + pad, e + pad],
    defaultHood: '',
    weather: '',
  };
}

export function ReviewMap({
  who,
  items,
  cats,
  scopes,
  defaultScope,
}: {
  who: string; // "Juan Carlos Tame's", "your"
  items: MapReview[]; // best first — their order is the rank
  cats: Opt[];
  scopes?: { key: string; label: string }[];
  defaultScope?: string;
}) {
  const openPlace = useStore((s) => s.openPlace);
  const [scope, setScope] = useState<string>(defaultScope || scopes?.[0]?.key || 'all');
  const [cat, setCat] = useState<string>('all');
  const [top, setTop] = useState(true);
  const [label, setLabel] = useState<'score' | 'rank'>(items.some((x) => x.score != null) ? 'score' : 'rank');
  const [sel, setSel] = useState<string | null>(null);

  const inScope = useMemo(() => items.filter((x) => !scopes || scope === 'all' || x.scope === scope), [items, scope, scopes]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    inScope.forEach((x) => (m[x.cat] = (m[x.cat] || 0) + 1));
    return m;
  }, [inScope]);
  const pick = cat !== 'all' && counts[cat] ? cat : 'all';
  const ranked = inScope.filter((x) => pick === 'all' || x.cat === pick); // their order: #1 first
  const numbered = ranked.map((x, i) => ({ ...x, rank: i + 1 }));
  const located = numbered.filter((x) => x.place.lat != null && x.place.lon != null);
  const shown = top ? located.slice(0, 10) : located;
  const missing = ranked.length - located.length;
  // the options: everything in the category (an address isn't needed to be an option)
  const options = top ? numbered.slice(0, 10) : numbered;
  const pins: Pin[] = shown.map((x) => {
    const t = tone(x.score);
    return { kind: 'grade', id: x.place.id, coord: { lat: x.place.lat!, lon: x.place.lon! }, bg: t.bg, fg: t.fg, metric: label === 'score' && x.score != null ? x.score.toFixed(1) : String(x.rank), dashed: false };
  });
  const city = useMemo(() => (shown.length ? boundsCity(shown.map((x) => x.place)) : null), [shown.map((x) => x.place.id).join('|')]);
  const cur = numbered.find((x) => x.place.id === sel);
  const chip = (on: boolean, dark?: boolean) => ({ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, backgroundColor: on ? (dark ? C.inkDeep : C.ink400) : C.paper0 });
  const toggle = (on: boolean) => ({ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: on ? C.inkDeep : C.paper0 });
  const reset = () => setSel(null);

  return (
    <View style={{ gap: 8 }} accessibilityLabel={`Map of ${who} reviews`}>
      {scopes && scopes.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 16 }}>
          {scopes.map((x) => (
            <Pressable key={x.key} onPress={() => (setScope(x.key), reset())} accessibilityLabel={`Map: ${x.label}`} accessibilityState={{ selected: scope === x.key }} style={chip(scope === x.key, true)}>
              <Banner s={9} tk={0.06} c={scope === x.key ? C.paper0 : C.inkDeep}>
                {x.label}
              </Banner>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {/* what — tap a category to see its options */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 16 }}>
        {[{ id: 'all', label: 'Everything' }, ...cats]
          .filter((x) => x.id === 'all' || counts[x.id])
          .map((x) => (
            <Pressable key={x.id} onPress={() => (setCat(x.id), reset())} accessibilityLabel={`Map category: ${x.label}`} accessibilityState={{ selected: pick === x.id }} style={chip(pick === x.id)}>
              <Banner s={9} tk={0.06} c={pick === x.id ? C.paper0 : C.inkDeep}>
                {x.label} {x.id === 'all' ? inScope.length : counts[x.id]}
              </Banner>
            </Pressable>
          ))}
      </ScrollView>
      {/* options */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden' }}>
          {[true, false].map((v) => (
            <Pressable key={String(v)} onPress={() => (setTop(v), reset())} accessibilityLabel={v ? 'Map: top 10' : 'Map: show all'} style={toggle(top === v)}>
              <Banner s={8.5} tk={0.08} c={top === v ? C.paper0 : C.inkDeep}>
                {v ? 'Top 10' : `All ${numbered.length}`}
              </Banner>
            </Pressable>
          ))}
        </View>
        {items.some((x) => x.score != null) ? (
          <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, overflow: 'hidden' }}>
            {(['score', 'rank'] as const).map((v) => (
              <Pressable key={v} onPress={() => setLabel(v)} accessibilityLabel={`Pins show ${v}`} style={toggle(label === v)}>
                <Banner s={8.5} tk={0.08} c={label === v ? C.paper0 : C.inkDeep}>
                  {v === 'score' ? 'Score' : '#'}
                </Banner>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Mono s={8.5} c={C.inkSoft} numberOfLines={1}>
          {shown.length} on the map{missing ? ` · ${missing} no address` : ''}
        </Mono>
      </View>
      {/* the map */}
      <View style={{ marginHorizontal: 16, height: 290, borderWidth: 2.5, borderColor: C.inkBlack, overflow: 'hidden', backgroundColor: C.paper100 }}>
        {city ? (
          <MapSurface key={scope} pins={pins} city={city} selPin={sel ? { kind: 'grade', id: sel } : null} onSelect={(p) => setSel(p.id === sel ? null : p.id)} fit />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Mono s={10} c={C.inkSoft}>
              Nothing with an address here yet
            </Mono>
          </View>
        )}
      </View>
      {/* the selected place, else the options in this category */}
      {cur ? (
        <StickerPressable
          offset="sm"
          onPress={() => openPlace(cur.place.id)}
          accessibilityLabel={`Open ${cur.place.name}`}
          style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 10 }}
        >
          <Display s={18} c={C.ink400} style={{ width: 34, textAlign: 'center' }}>
            {cur.rank}
          </Display>
          <Monogram name={cur.place.name} size={36} rot="-4deg" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Serif s={14} c={C.inkDeep} numberOfLines={1}>
              {cur.place.name}
            </Serif>
            <Mono s={8} c={C.inkMuted} numberOfLines={1}>
              {[cur.place.hood, cats.find((c) => c.id === cur.cat)?.label, cur.place.lat == null ? 'not on the map' : ''].filter(Boolean).join(' · ')}
            </Mono>
            {cur.note ? (
              <Serif s={11} c={C.inkSoft} numberOfLines={2} style={{ marginTop: 3, fontStyle: 'italic', lineHeight: 15 }}>
                “{cur.note}”
              </Serif>
            ) : null}
          </View>
          {cur.score != null ? (
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tone(cur.score).bg, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={13} c={tone(cur.score).fg}>
                {cur.score.toFixed(1)}
              </Display>
            </View>
          ) : null}
          <Display s={14} c={C.inkSoft}>
            →
          </Display>
        </StickerPressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {options.slice(0, 30).map((x) => (
            <Pressable
              key={x.place.id}
              onPress={() => setSel(x.place.id)}
              accessibilityLabel={`Option #${x.rank}: ${x.place.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 10 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: tone(x.score).bg, borderWidth: 1.5, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center' }}>
                <Mono s={8.5} c={tone(x.score).fg}>
                  {x.rank}
                </Mono>
              </View>
              <Serif s={12} c={C.inkDeep} numberOfLines={1} style={{ maxWidth: 150 }}>
                {x.place.name}
              </Serif>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** A section heading for the map, in the profiles' style. */
export function ReviewMapHeading({ title, n, note }: { title: string; n?: number; note?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampBlue }} />
      <Banner s={10} tk={0.16} c={C.inkMuted}>
        {title}
      </Banner>
      <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
      {note ? (
        <Mono s={9} c={C.inkSoft}>
          {note}
        </Mono>
      ) : n != null ? (
        <Mono s={9} c={C.inkSoft}>
          {n}
        </Mono>
      ) : null}
    </View>
  );
}

