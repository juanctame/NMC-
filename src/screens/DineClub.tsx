/**
 * Dine Club (hidden) — unlocked by tapping the corner logo 5× quickly. An
 * immersive near-black field (deliberately off-brand-dark for exclusivity):
 * private dinners you can request a seat at, and members-only threads.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CLUB_EVENTS } from '../store/data';
import { CHANNELS } from '../data/charter';
import { SEED_CHANNEL_POSTS } from '../data/channels';
import { C, col } from '../theme/tokens';
import { photo } from '../assets';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Photo } from '../components/Photo';
import { GlobeMark } from '../components/icons';
import { Grain } from '../components/Grain';
import { Segmented } from '../components/Segmented';
import { Charter } from '../components/Charter';
import { ScreenIn } from '../components/Anim';

/** One card in the channel directory (the club's structured chats). */
function ChannelRow({ tag, count, onPress }: { tag: string; count: number; onPress: () => void }) {
  const ch = CHANNELS.find((c) => c.tag === tag)!;
  return (
    <StickerPressable offset="sm" onPress={onPress} style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.paper0, paddingVertical: 13, paddingHorizontal: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Display s={18} c={C.sun400}>
          {ch.tag}
        </Display>
        <Banner s={9.5} tk={0.06} c={C.paper0} style={{ flex: 1 }} numberOfLines={1}>
          {ch.name}
        </Banner>
        <Mono s={9} c={C.sun300}>
          {count} →
        </Mono>
      </View>
      <SerifItalic s={12} c={C.ink100} style={{ marginTop: 5, lineHeight: 18 }} numberOfLines={2}>
        {ch.intro}
      </SerifItalic>
    </StickerPressable>
  );
}

function ClubEventCard({ ev }: { ev: (typeof CLUB_EVENTS)[number] }) {
  const requestClub = useStore((s) => s.requestClub);
  const req = useStore((s) => !!s.clubReq[ev.id]);
  const reqLabel = req ? 'Seat requested ✓' : ev.left <= 0 ? 'Join waitlist' : 'Request a seat';
  return (
    <StickerView offset="lg" style={{ backgroundColor: C.ink700, borderWidth: 2.5, borderColor: C.paper0, overflow: 'hidden' }}>
      <Photo source={photo(ev.photo)} style={{ width: '100%', height: 132, borderBottomWidth: 2.5, borderColor: C.paper0 }} warm={0.12} />
      <View style={{ paddingVertical: 14, paddingHorizontal: 15 }}>
        <Banner s={10} tk={0.18} c={C.sun400}>
          {ev.mo} {ev.d} · {ev.wd} · {ev.time}
        </Banner>
        <Display s={21} c={C.paper0} style={{ marginTop: 5 }}>
          {ev.title}
        </Display>
        <Mono s={10} c={C.sun300} style={{ marginTop: 5 }}>
          {ev.place}
        </Mono>
        <Serif s={13} c={C.ink100} style={{ marginTop: 9, lineHeight: 20 }}>
          {ev.desc}
        </Serif>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => requestClub(ev.id)}
            style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 11, backgroundColor: req ? C.stampGreen : C.sun400 }}
          >
            <Banner s={11} tk={0.1} c={req ? C.greenFg : C.inkDeep}>
              {reqLabel}
            </Banner>
          </StickerPressable>
          <Mono s={9.5} c={C.ink200}>
            {ev.seats} seats · {ev.left} left
          </Mono>
        </View>
      </View>
    </StickerView>
  );
}

export function DineClub() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const clubSeg = useStore((s) => s.clubSeg);
  const setClubSeg = useStore((s) => s.setClubSeg);
  const openChannel = useStore((s) => s.openChannel);
  const channelUserPosts = useStore((s) => s.channelUserPosts);

  const channelCount = (tag: string) =>
    SEED_CHANNEL_POSTS.filter((p) => p.channel === tag).length + (channelUserPosts[tag]?.length || 0);

  return (
    <ScreenIn style={{ backgroundColor: C.inkBlack }}>
      <Grain opacity={0.05} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => go('table')} style={{ paddingHorizontal: 4 }}>
            <Display s={20} c={C.sun400}>
              ←
            </Display>
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <GlobeMark size={30} color={C.ink400} />
            <Display s={26} c={C.paper0}>
              Dine Club
            </Display>
          </View>
          <View style={{ transform: [{ rotate: '-2deg' }], backgroundColor: C.sun400, borderWidth: 2, borderColor: C.paper0, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Banner s={9} tk={0.14} c={C.inkDeep}>
              Members
            </Banner>
          </View>
        </View>
        <SerifItalic s={13} c={C.sun300} style={{ marginTop: 8 }}>
          You’re in. Private dinners, openings, and scoops — before anyone else.
        </SerifItalic>
        <View style={{ marginTop: 14 }}>
          <Segmented
            items={[
              { key: 'events', label: 'Events' },
              { key: 'community', label: 'Community' },
              { key: 'code', label: 'El código' },
            ]}
            value={clubSeg}
            onChange={(k) => setClubSeg(k as any)}
            activeFg={C.paper0}
            inactiveFg={C.ink200}
            activeBorder={C.sun400}
            containerBorderColor={C.ink700}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 30, gap: 14 }} showsVerticalScrollIndicator={false}>
        {clubSeg === 'code' ? (
          <Charter />
        ) : clubSeg === 'events' ? (
          <>
            {CLUB_EVENTS.map((ev) => (
              <ClubEventCard key={ev.id} ev={ev} />
            ))}
            <Mono s={10} c={C.ink200} style={{ textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
              No phones at the table. Attend three, and you host the next one.
            </Mono>
          </>
        ) : (
          <>
            <Mono s={10} c={C.ink200} style={{ marginBottom: 2, lineHeight: 16 }}>
              Los canales de la comunidad. Cada uno con sus reglas y su plantilla.
            </Mono>
            {CHANNELS.map((ch) => (
              <ChannelRow key={ch.tag} tag={ch.tag} count={channelCount(ch.tag)} onPress={() => openChannel(ch.tag)} />
            ))}
            <Mono s={10} c={C.ink200} style={{ textAlign: 'center', marginTop: 4 }}>
              Lo que se dice en CRTQ se queda en CRTQ.
            </Mono>
          </>
        )}
      </ScrollView>
    </ScreenIn>
  );
}
