/**
 * A single club channel, as a chat. Opened from the Dine Club's channel
 * directory. Shows the channel's rules (collapsible), the feed of posts
 * (members' posts merged over the seed, newest first), and a "Publicar" button
 * that opens the template composer. Rendered on the club's exclusive dark field.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CHANNELS } from '../data/charter';
import { SEED_CHANNEL_POSTS, kindStyle, agoEs, type ChannelPost } from '../data/channels';
import { C, col } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { Grain } from '../components/Grain';
import { PlusIcon } from '../components/icons';
import { ScreenIn } from '../components/Anim';

function PostCard({ post }: { post: ChannelPost }) {
  const ks = kindStyle(post.kind);
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.ink700, borderWidth: 2, borderColor: C.paper0, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col(post.color), borderWidth: 2, borderColor: C.paper0, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Banner s={12} c={C.paper0}>
            {post.initials}
          </Banner>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={11} tk={0.06} c={C.paper0} numberOfLines={1}>
            {post.author}
          </Banner>
          <Mono s={9} c={C.sun300}>
            {post.handle} · {agoEs(post.createdAt)}
          </Mono>
        </View>
        {post.kind ? (
          <View style={{ backgroundColor: ks.bg, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, transform: [{ rotate: '2deg' }] }}>
            <Banner s={9} tk={0.08} c={ks.fg}>
              {post.kind}
            </Banner>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 11, gap: 7 }}>
        {post.fields.map((f, i) => {
          const geo = f.label.includes('·') || /lugar|nombre/i.test(f.label);
          const isMsg = f.label.toLowerCase() === 'mensaje';
          if (isMsg) {
            return (
              <Serif key={i} s={13.5} c={C.paper0} style={{ lineHeight: 21 }}>
                {f.value}
              </Serif>
            );
          }
          return (
            <View key={i}>
              <Banner s={8} tk={0.12} c={C.ink200}>
                {f.label}
              </Banner>
              <Serif s={geo ? 14 : 12.5} c={geo ? C.sun300 : C.ink100} style={{ lineHeight: 19, marginTop: 1 }}>
                {f.value}
              </Serif>
            </View>
          );
        })}
      </View>
    </StickerView>
  );
}

export function Channel() {
  const insets = useSafeAreaInsets();
  const goClub = useStore((s) => s.goClub);
  const tag = useStore((s) => s.activeChannel);
  const userPosts = useStore((s) => (tag ? s.channelUserPosts[tag] : undefined));
  const openComposer = useStore((s) => s.openChannelComposer);
  const [showRules, setShowRules] = useState(false);

  const ch = CHANNELS.find((c) => c.tag === tag);
  if (!ch) {
    return <View style={{ flex: 1, backgroundColor: C.inkBlack }} />;
  }
  const seed = SEED_CHANNEL_POSTS.filter((p) => p.channel === tag);
  const feed = [...(userPosts || []), ...seed].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScreenIn style={{ backgroundColor: C.inkBlack }}>
      <Grain opacity={0.05} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={goClub} style={{ paddingHorizontal: 4 }}>
            <Display s={20} c={C.sun400}>
              ←
            </Display>
          </Pressable>
          <Display s={24} c={C.sun400}>
            {ch.tag}
          </Display>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setShowRules((v) => !v)} style={{ borderWidth: 2, borderColor: C.ink700, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}>
            <Banner s={9} tk={0.1} c={C.ink100}>
              {showRules ? 'Ocultar reglas' : 'Reglas'}
            </Banner>
          </Pressable>
        </View>
        <Banner s={10} tk={0.1} c={C.paper0} style={{ marginTop: 8 }}>
          {ch.name}
        </Banner>
        <SerifItalic s={12.5} c={C.ink100} style={{ marginTop: 4, lineHeight: 19 }}>
          {ch.intro}
        </SerifItalic>

        {showRules ? (
          <StickerView offset="sm" style={{ backgroundColor: C.ink800, borderWidth: 2, borderColor: C.sun400, padding: 13, marginTop: 12 }}>
            <Banner s={8.5} tk={0.14} c={C.stampGreen}>
              Qué va
            </Banner>
            <Serif s={12} c={C.ink100} style={{ lineHeight: 18, marginTop: 2 }}>
              {ch.goes}
            </Serif>
            <Banner s={8.5} tk={0.14} c={C.ink300} style={{ marginTop: 8 }}>
              Qué no va
            </Banner>
            <Serif s={12} c={C.ink200} style={{ lineHeight: 18, marginTop: 2 }}>
              {ch.notGoes}
            </Serif>
            {ch.rules.length ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                {ch.rules.map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <Mono s={11} c={C.sun400}>
                      ·
                    </Mono>
                    <Serif s={11.5} c={C.ink100} style={{ flex: 1, lineHeight: 17 }}>
                      {r}
                    </Serif>
                  </View>
                ))}
              </View>
            ) : null}
          </StickerView>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 90, gap: 12 }} showsVerticalScrollIndicator={false}>
        {feed.length ? (
          feed.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <Mono s={11} c={C.ink200} style={{ textAlign: 'center', marginTop: 20 }}>
            Sé el primero en publicar en este canal.
          </Mono>
        )}
      </ScrollView>

      {/* publish */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: 'rgba(27,16,4,0.92)', borderTopWidth: 2, borderColor: C.ink700 }}>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={openComposer}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 13 }}
        >
          <PlusIcon size={15} color={C.inkDeep} sw={2.6} />
          <Banner s={12} tk={0.1} c={C.inkDeep}>
            Publicar con plantilla
          </Banner>
        </StickerPressable>
      </View>
    </ScreenIn>
  );
}
