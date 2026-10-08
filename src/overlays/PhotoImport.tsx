/**
 * "Build your passport from photos" — the onboarding accelerator. Opens the
 * device photo picker, reads each photo's location tag on-device (nothing is
 * uploaded), matches it to the restaurant there, and lets the user confirm which
 * spots to register into their log. Turns "empty app" into "here's everywhere
 * you've been" in a couple of taps.
 */
import React from 'react';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { C } from '../theme/tokens';
import { metaOf } from '../store/helpers';
import { Display, Banner, Serif, SerifItalic, SerifDisplay, Mono } from '../components/Text';
import { StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

function Primary({ label, onPress, disabled, bg = C.ink400, fg = C.paper0 }: { label: string; onPress: () => void; disabled?: boolean; bg?: string; fg?: string }) {
  return (
    <StickerPressable
      offset="sm"
      radius={999}
      onPress={disabled ? () => {} : onPress}
      disabled={disabled}
      style={{ alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: bg, paddingVertical: 14, opacity: disabled ? 0.45 : 1 }}
    >
      <Banner s={13} tk={0.1} c={fg}>
        {label}
      </Banner>
    </StickerPressable>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 34 }}>
      <ActivityIndicator color={C.ink400} />
      <Serif s={14} c={C.inkMuted} style={{ textAlign: 'center' }}>
        {text}
      </Serif>
    </View>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 14, paddingTop: 6 }}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <SerifDisplay s={22} c={C.inkDeep} style={{ textAlign: 'center' }}>
          {title}
        </SerifDisplay>
        <Serif s={13.5} c={C.inkMuted} style={{ textAlign: 'center', lineHeight: 20, maxWidth: 320 }}>
          {body}
        </Serif>
      </View>
      {children}
    </View>
  );
}

export function PhotoImport() {
  const insets = useSafeAreaInsets();
  const status = useStore((s) => s.photoImportStatus);
  const matches = useStore((s) => s.photoMatches);
  const scanned = useStore((s) => s.photoScanned);
  const added = useStore((s) => s.photoAdded);
  const run = useStore((s) => s.runPhotoImport);
  const toggle = useStore((s) => s.togglePhotoMatch);
  const confirm = useStore((s) => s.confirmPhotoMatches);
  const close = useStore((s) => s.closePhotoImport);
  const go = useStore((s) => s.go);

  const pickedCount = matches.filter((m) => m.picked).length;
  const photoTotal = matches.reduce((n, m) => n + m.count, 0);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60 }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,26,6,0.55)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ maxHeight: '88%', backgroundColor: C.paper50, borderTopWidth: 2.5, borderColor: C.inkBlack, paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <Display s={23} c={C.inkDeep}>
              Build from photos
            </Display>
            <Pressable onPress={close} hitSlop={8}>
              <Mono s={12} c={C.inkMuted}>
                Close ✕
              </Mono>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            {status === 'idle' ? (
              <View style={{ gap: 14, paddingTop: 2 }}>
                <SerifItalic s={14.5} c={C.inkMuted} style={{ lineHeight: 21 }}>
                  Been eating out already? Point us at your food photos and we'll find the spots you've been — then drop them straight into your passport.
                </SerifItalic>
                <View style={{ flexDirection: 'row', gap: 10, backgroundColor: C.paper0, borderWidth: 2, borderColor: C.inkBlack, padding: 13 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.stampGreen, marginTop: 4 }} />
                  <View style={{ flex: 1 }}>
                    <Banner s={9} tk={0.14} c={C.inkMuted}>
                      Private by design
                    </Banner>
                    <Serif s={13} c={C.inkDeep} style={{ marginTop: 4, lineHeight: 19 }}>
                      Your photos never leave your device. We read only each photo's location tag, then ask which restaurant sits there.
                    </Serif>
                  </View>
                </View>
                <Primary label="Choose photos →" onPress={run} bg={C.sun400} fg={C.inkDeep} />
                <Mono s={9.5} c={C.inkSoft} style={{ textAlign: 'center', lineHeight: 15 }}>
                  Works best with photos taken at the table. Screenshots & location-stripped photos are skipped.
                </Mono>
              </View>
            ) : null}

            {status === 'picking' ? <Busy text="Opening your photos…" /> : null}
            {status === 'matching' ? <Busy text={`Reading locations & matching… (${scanned} photo${scanned === 1 ? '' : 's'})`} /> : null}

            {status === 'review' ? (
              <View style={{ gap: 12, paddingTop: 2 }}>
                <SerifItalic s={13.5} c={C.inkMuted} style={{ lineHeight: 20 }}>
                  {`Matched ${photoTotal} photo${photoTotal === 1 ? '' : 's'} to ${matches.length} spot${matches.length === 1 ? '' : 's'}. Uncheck anything that isn't right, then add the rest.`}
                </SerifItalic>
                <View style={{ gap: 9 }}>
                  {matches.map((m) => (
                    <StickerPressable
                      key={m.place.id}
                      offset="sm"
                      onPress={() => toggle(m.place.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: m.picked ? C.paper0 : C.paper100, borderWidth: 2.5, borderColor: C.inkBlack, paddingVertical: 9, paddingHorizontal: 11, opacity: m.picked ? 1 : 0.6 }}
                    >
                      <Image source={{ uri: m.preview }} style={{ width: 52, height: 52, borderWidth: 2, borderColor: C.inkBlack }} contentFit="cover" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <SerifDisplay s={15} c={C.inkDeep} numberOfLines={1} style={{ lineHeight: 17 }}>
                          {m.place.name}
                        </SerifDisplay>
                        <Mono s={9} c={C.inkMuted} style={{ marginTop: 3 }} numberOfLines={1}>
                          {metaOf(m.place)}
                        </Mono>
                        <Mono s={8.5} c={C.inkSoft} style={{ marginTop: 2 }}>
                          {m.distM} m away · {m.count} photo{m.count === 1 ? '' : 's'}
                        </Mono>
                      </View>
                      <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.inkBlack, backgroundColor: m.picked ? C.stampGreen : C.paper0, alignItems: 'center', justifyContent: 'center' }}>
                        {m.picked ? (
                          <Banner s={12} c={C.paper0}>
                            ✓
                          </Banner>
                        ) : null}
                      </View>
                    </StickerPressable>
                  ))}
                </View>
                <Primary label={pickedCount ? `Add ${pickedCount} to my passport` : 'Pick at least one'} onPress={confirm} disabled={!pickedCount} bg={C.stampGreen} />
                <Pressable onPress={run} style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Mono s={11} c={C.ink400} style={{ textDecorationLine: 'underline' }}>
                    Choose different photos
                  </Mono>
                </Pressable>
              </View>
            ) : null}

            {status === 'done' ? (
              <Notice
                title={added ? `${added} spot${added === 1 ? '' : 's'} added!` : 'Nothing added'}
                body={added ? "They're in your Guide now — tap any to set your real rank whenever you like." : 'No spots were selected. You can try again anytime.'}
              >
                {added ? (
                  <Primary
                    label="See my Guide →"
                    onPress={() => {
                      close();
                      go('log');
                    }}
                    bg={C.sun400}
                    fg={C.inkDeep}
                  />
                ) : null}
                <Primary label="Done" onPress={close} bg={C.paper0} fg={C.inkDeep} />
              </Notice>
            ) : null}

            {status === 'nogps' ? (
              <Notice
                title="No location tags found"
                body={`The ${scanned} photo${scanned === 1 ? '' : 's'} you picked don't carry a location — phone browsers often strip it for privacy. Try from a computer, pick photos straight from your camera roll, or add spots by hand.`}
              >
                <Primary label="Try other photos" onPress={run} bg={C.sun400} fg={C.inkDeep} />
                <Primary label="Close" onPress={close} bg={C.paper0} fg={C.inkDeep} />
              </Notice>
            ) : null}

            {status === 'nomatch' ? (
              <Notice title="Couldn't match those" body="We read the locations but didn't find restaurants there. Food photos taken at the venue work best.">
                <Primary label="Try again" onPress={run} bg={C.sun400} fg={C.inkDeep} />
                <Primary label="Close" onPress={close} bg={C.paper0} fg={C.inkDeep} />
              </Notice>
            ) : null}

            {status === 'unsupported' ? (
              <Notice title="Open the web app for this" body="Importing from your camera roll runs in the CRTQ web app. Open it in a browser to build your passport from photos.">
                <Primary label="Close" onPress={close} bg={C.paper0} fg={C.inkDeep} />
              </Notice>
            ) : null}

            {status === 'error' ? (
              <Notice title="That didn't go through" body="Something interrupted the import. Give it another go.">
                <Primary label="Try again" onPress={run} bg={C.sun400} fg={C.inkDeep} />
                <Primary label="Close" onPress={close} bg={C.paper0} fg={C.inkDeep} />
              </Notice>
            ) : null}
          </ScrollView>
        </SheetUp>
      </View>
    </View>
  );
}
