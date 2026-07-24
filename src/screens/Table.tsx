/**
 * The Table — group reservations (Playtomic-style), community events, and
 * message threads. Open tables carry a Public / Friends-only visibility badge;
 * friends-only tables from non-mutual-follows render a disabled join.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { EVENTS, OPEN, PARTY, THREADS, type EventT } from '../store/data';
import { C, col } from '../theme/tokens';
import { isCritic } from '../data/profile';
import { Display, Banner, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Segmented } from '../components/Segmented';
import { Grain } from '../components/Grain';
import { MapIcon, PlusIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

const FMAP: Record<string, string> = { RM: 'rm', DF: 'df', ML: 'ml', SR: 'sr', AV: 'av' };

function TableCard({ t }: { t: any }) {
  const openEvent = useStore((s) => s.openEvent);
  const joinTable = useStore((s) => s.joinTable);
  const rsvped = useStore((s) => !!s.rsvped[t.id]);
  const waitlisted = useStore((s) => !!s.waitlisted[t.id]);
  const follows = useStore((s) => s.follows);

  const meIn = rsvped || !!t.mine;
  const roster = (t.joined || PARTY[t.id] || []).map((a: [string, string]) => ({ ini: a[0], color: a[1] }));
  const avatars = (meIn && !t.mine ? [{ ini: 'JO', color: 'var(--sun-400)' }] : []).concat(roster);
  const takenN = t.taken + (meIn && !t.mine ? 1 : 0);
  const left = t.spots - takenN;
  const full = left <= 0;
  const shown = avatars.slice(0, 4);
  const extra = Math.max(0, avatars.length - shown.length);
  const vis = t.visibility || 'public';
  const fid = t.opener ? FMAP[t.opener[0]] : null;
  const allowed = t.mine || vis === 'public' || (fid && !!follows[fid]);
  const locked = vis === 'private' && !allowed;

  const joinLabel = t.mine
    ? 'You host'
    : locked
      ? 'Friends only'
      : meIn
        ? 'You’re in ✓'
        : waitlisted
          ? 'Waitlisted ✓'
          : full
            ? 'Join waitlist'
            : 'Join table';
  const joinBg = locked ? C.paper100 : meIn || waitlisted ? C.stampGreen : full ? C.paper0 : C.ink400;
  const joinFg = locked ? C.inkSoft : meIn || waitlisted ? C.greenFg : full ? C.inkDeep : C.paper0;

  return (
    <StickerView offset="lg" style={{ backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack }}>
      {t.mine ? (
        <View style={{ position: 'absolute', top: -10, right: 10, zIndex: 5, transform: [{ rotate: '2deg' }] }}>
          <StickerView offset="sm" radius={999} style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Banner s={9} tk={0.14} c={C.inkDeep}>
              Yours
            </Banner>
          </StickerView>
        </View>
      ) : null}
      {t.critic ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.ink400, borderBottomWidth: 2, borderColor: C.inkBlack, paddingVertical: 5, paddingHorizontal: 13 }}>
          <Banner s={8.5} tk={0.14} c={C.paper0}>
            ✓ CRITIC EVENT
          </Banner>
          <View style={{ flex: 1 }} />
          <Banner s={8} tk={0.1} c={C.sun300}>
            VERIFIED HOST
          </Banner>
        </View>
      ) : null}
      <Pressable onPress={() => openEvent(t.id)} style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: C.inkBlack }}>
        <View style={{ width: 72, backgroundColor: C.sun400, borderRightWidth: 2.5, borderRightColor: C.inkBlack, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
          <Banner s={9} tk={0.18} c={C.ink500}>
            {t.mo}
          </Banner>
          <Display s={26} c={C.ink400}>
            {t.d}
          </Display>
          <Mono s={9} c={C.ink600} style={{ marginTop: 2 }}>
            {t.wd} {t.time}
          </Mono>
        </View>
        <View style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 13 }}>
          <SerifDisplay s={17} c={C.inkDeep} style={{ lineHeight: 19 }}>
            {t.title}
          </SerifDisplay>
          <Mono s={10} c={C.inkMuted} style={{ marginTop: 3 }}>
            {t.route}
          </Mono>
          <Mono s={9.5} c={C.inkSoft} style={{ marginTop: 3 }}>
            {t.host}
          </Mono>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 13 }}>
        <View style={{ flexDirection: 'row', paddingLeft: 6 }}>
          {shown.map((a: any, i: number) => (
            <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: col(a.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
              <Banner s={8.5} c={C.paper0}>
                {a.ini}
              </Banner>
            </View>
          ))}
          {extra > 0 ? (
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper100, borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
              <Mono s={8.5} c={C.inkDeep}>
                +{extra}
              </Mono>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <View style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: full ? C.stampPink : C.sun400 }}>
            <Banner s={9} tk={0.1} c={full ? C.pinkFg : C.inkDeep}>
              {full ? 'Full' : `${left} open`}
            </Banner>
          </View>
          <Mono s={9} c={C.inkSoft}>
            {takenN} of {t.spots} seats
          </Mono>
          <View style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: vis === 'private' ? C.ink700 : C.paper100 }}>
            <Banner s={8} tk={0.08} c={vis === 'private' ? C.paper0 : C.inkMuted}>
              {vis === 'private' ? 'Friends only' : 'Public'}
            </Banner>
          </View>
        </View>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => (t.mine || locked ? undefined : joinTable(t.id, full))}
          disabled={t.mine || locked}
          style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: joinBg }}
        >
          <Banner s={10} tk={0.1} c={joinFg}>
            {joinLabel}
          </Banner>
        </StickerPressable>
      </View>
    </StickerView>
  );
}

function ThreadRow({ t }: { t: (typeof THREADS)[number] }) {
  const openThread = useStore((s) => s.openThread);
  return (
    <StickerPressable
      offset="sm"
      onPress={() => openThread(t.id)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper0, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 12, paddingHorizontal: 14 }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: col(t.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
        <Display s={15} c={C.paper0}>
          {t.initials}
        </Display>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Banner s={12} tk={0.08} c={C.inkDeep}>
          {t.name}
        </Banner>
        <Mono s={10.5} c={C.inkMuted} style={{ marginTop: 3 }} numberOfLines={1}>
          {t.last}
        </Mono>
      </View>
      {t.unread > 0 ? (
        <View style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
          <Banner s={9} c={C.inkDeep}>
            {t.unread}
          </Banner>
        </View>
      ) : null}
    </StickerPressable>
  );
}

export function Table() {
  const insets = useSafeAreaInsets();
  const tableSeg = useStore((s) => s.tableSeg);
  const setTableSeg = useStore((s) => s.setTableSeg);
  const createdTables = useStore((s) => s.createdTables);
  const openCreate = useStore((s) => s.openCreate);
  const openMap = useStore((s) => s.openMap);
  const profile = useStore((s) => s.profile);
  const critic = isCritic(profile);

  const seedTables: EventT[] = [...createdTables, ...OPEN, ...EVENTS];

  return (
    <ScreenIn>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, backgroundColor: C.sun400, borderBottomWidth: 2.5, borderBottomColor: C.inkBlack }}>
        <Grain opacity={0.06} />
        <Display s={30} c={C.inkDeep}>
          The Table
        </Display>
        <SerifItalic s={13} c={C.ink700} style={{ marginTop: 3 }}>
          Eat together — events, community, and the club.
        </SerifItalic>
        <View style={{ marginTop: 14 }}>
          <Segmented
            items={[
              { key: 'events', label: 'Events' },
              { key: 'community', label: 'Community' },
            ]}
            value={tableSeg}
            onChange={(k) => setTableSeg(k as any)}
            activeFg={C.inkDeep}
            inactiveFg={C.ink700}
            activeBorder={C.ink400}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 14 }} showsVerticalScrollIndicator={false}>
        {tableSeg === 'events' ? (
          <>
            {critic ? (
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => openCreate('event')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.ink700, borderRadius: 999, paddingVertical: 14 }}
              >
                <PlusIcon size={16} color={C.sun400} sw={2.6} />
                <Banner s={12.5} tk={0.1} c={C.paper0}>
                  Host an event
                </Banner>
                <View style={{ backgroundColor: C.ink400, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
                  <Banner s={7.5} tk={0.12} c={C.paper0}>
                    CRITIC
                  </Banner>
                </View>
              </StickerPressable>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StickerPressable
                offset="sm"
                radius={999}
                onPress={() => openCreate('table')}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: critic ? C.paper0 : C.ink400, borderRadius: 999, paddingVertical: 13 }}
              >
                <PlusIcon size={16} color={critic ? C.ink400 : C.paper0} sw={2.6} />
                <Banner s={12} tk={0.1} c={critic ? C.inkDeep : C.paper0}>
                  Open a table
                </Banner>
              </StickerPressable>
              <StickerPressable offset="sm" radius={999} onPress={openMap} style={{ width: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.paper0, borderRadius: 999 }}>
                <MapIcon size={19} color={C.ink400} />
              </StickerPressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
              <Banner s={11} tk={0.14} c={C.inkDeep}>
                Open tables
              </Banner>
              <Mono s={9.5} c={C.inkSoft}>
                grab a seat · or host your own
              </Mono>
            </View>
            {seedTables.map((t) => (
              <TableCard key={t.id} t={t} />
            ))}
            <Mono s={10} c={C.inkSoft} style={{ textAlign: 'center', marginTop: 6 }}>
              Tables are free to join — you split the bill in person.
            </Mono>
          </>
        ) : (
          <>
            {THREADS.map((t) => (
              <ThreadRow key={t.id} t={t} />
            ))}
            <Mono s={10} c={C.inkSoft} style={{ textAlign: 'center', marginTop: 4 }}>
              Share pins, Beli lists, and split the bill — right in the thread.
            </Mono>
          </>
        )}
      </ScrollView>
    </ScreenIn>
  );
}
