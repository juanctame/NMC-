/**
 * Community thread — message bubbles (own = sun, others = paper), some carrying
 * third-party app cards, plus a composer with an attach button that opens the
 * app picker.
 */
import React from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { THREADS, CLUB_THREADS, type Message } from '../store/data';
import { C, col } from '../theme/tokens';
import { Display, Banner, Serif, Mono } from '../components/Text';
import { StickerView, StickerPressable } from '../components/Sticker';
import { MessageCard } from '../components/MessageCard';
import { ScreenIn } from '../components/Anim';

function Bubble({ m }: { m: Message }) {
  const mine = !!m.mine;
  return (
    <StickerView
      offset="sm"
      style={{
        maxWidth: '87%',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        backgroundColor: mine ? C.sun100 : C.paper0,
        borderWidth: 2,
        borderColor: C.inkBlack,
      }}
    >
      {m.pinned ? (
        <View style={{ position: 'absolute', top: -11, right: 10, zIndex: 2, transform: [{ rotate: '2deg' }], backgroundColor: C.sun400, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9 }}>
          <Banner s={8.5} tk={0.12} c={C.inkDeep}>
            Pinned
          </Banner>
        </View>
      ) : null}
      {m.best ? (
        <View style={{ position: 'absolute', top: -11, right: 10, zIndex: 2, transform: [{ rotate: '3deg' }], backgroundColor: C.stampGreen, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9 }}>
          <Banner s={8.5} tk={0.12} c={C.greenFg}>
            ★ Best answer
          </Banner>
        </View>
      ) : null}

      {m.text || (!mine && m.who) ? (
        <View style={{ paddingVertical: 9, paddingHorizontal: 12 }}>
          {!mine && m.who ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <Banner s={10} tk={0.1} c={col(m.whoColor || 'var(--ink-400)')}>
                {m.who}
              </Banner>
              {m.host ? (
                <View style={{ borderWidth: 1.5, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 6, backgroundColor: C.sun400 }}>
                  <Mono s={8.5} c={C.inkDeep}>
                    HOST
                  </Mono>
                </View>
              ) : null}
            </View>
          ) : null}
          {m.text ? (
            <Serif s={13.5} style={{ lineHeight: 20 }}>
              {m.text}
            </Serif>
          ) : null}
        </View>
      ) : null}

      {m.card ? <MessageCard card={m.card} /> : null}

      {m.time ? (
        <Mono s={8.5} c={C.inkSoft} style={{ textAlign: 'right', paddingHorizontal: 12, paddingBottom: 7 }}>
          {m.time}
        </Mono>
      ) : null}
    </StickerView>
  );
}

export function Thread() {
  const insets = useSafeAreaInsets();
  const go = useStore((s) => s.go);
  const activeThreadId = useStore((s) => s.activeThreadId);
  const threadAdded = useStore((s) => s.threadAdded);
  const draft = useStore((s) => s.draft);
  const setDraft = useStore((s) => s.setDraft);
  const sendMsg = useStore((s) => s.sendMsg);
  const openAttach = useStore((s) => s.openAttach);

  const raw = [...THREADS, ...CLUB_THREADS].find((t) => t.id === activeThreadId) || THREADS[0];
  const msgs: Message[] = [...raw.msgs, ...(threadAdded[raw.id] || [])];

  return (
    <ScreenIn style={{ backgroundColor: C.paper100 }}>
      {/* header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.paper50, borderBottomWidth: 2.5, borderColor: C.inkBlack, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => go('table')} style={{ paddingHorizontal: 4 }}>
          <Display s={20} c={C.ink400}>
            ←
          </Display>
        </Pressable>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: col(raw.color), borderWidth: 2, borderColor: C.inkBlack, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Display s={14} c={C.paper0}>
            {raw.initials}
          </Display>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Banner s={13} tk={0.1} c={C.inkDeep}>
            {raw.name}
          </Banner>
          <Mono s={9.5} c={C.inkMuted}>
            {raw.sub}
          </Mono>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
        </ScrollView>

        {/* composer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: 2.5, borderColor: C.inkBlack, backgroundColor: C.paper50 }}>
          <StickerView offset="sm" radius={999}>
            <Pressable onPress={openAttach} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: C.sun400, alignItems: 'center', justifyContent: 'center' }}>
              <Display s={18} c={C.inkDeep}>
                +
              </Display>
            </Pressable>
          </StickerView>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={sendMsg}
            placeholder="Message the table…"
            placeholderTextColor={C.inkSoft}
            style={{ flex: 1, minWidth: 0, fontFamily: 'Fraunces_400Regular', fontSize: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.paper0, color: C.inkBlack }}
          />
          <StickerPressable offset="sm" radius={999} onPress={sendMsg} style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.ink400, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Banner s={11} tk={0.1} c={C.paper0}>
              Send
            </Banner>
          </StickerPressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenIn>
  );
}
