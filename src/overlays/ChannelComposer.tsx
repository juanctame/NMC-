/**
 * Channel post composer — the template that makes distributing information easy.
 * It reads the active channel's plantilla (from the charter, parsed into fields)
 * and renders it as a form: a kind/verdict selector, quick-pick chips for the
 * fixed choices (declaración, ocasión, confirmación…), and labelled inputs for
 * the rest. Posting hands a clean, consistent, geo-sealed entry to the channel.
 */
import React from 'react';
import { View, Pressable, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CHANNELS } from '../data/charter';
import { channelForm, kindStyle, type ChannelField } from '../data/channels';
import { C } from '../theme/tokens';
import { Display, Banner, SerifItalic, Mono } from '../components/Text';
import { StickerPressable } from '../components/Sticker';
import { SheetUp } from '../components/Anim';

function inputStyle(multiline?: boolean) {
  return {
    fontFamily: 'Fraunces_400Regular' as const,
    fontSize: 14,
    lineHeight: 20,
    color: C.paper0,
    backgroundColor: C.ink800,
    borderWidth: 2,
    borderColor: C.ink100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    ...(multiline ? { minHeight: 70, textAlignVertical: 'top' as const } : null),
  };
}

function KindRow({ options, value, onSelect }: { options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
      {options.map((o) => {
        const on = value === o;
        const ks = kindStyle(o);
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={{ borderWidth: 2, borderColor: on ? C.inkBlack : C.ink700, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: on ? ks.bg : 'transparent' }}
          >
            <Banner s={10} tk={0.06} c={on ? ks.fg : C.ink100}>
              {o}
            </Banner>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceRow({ field, value, onSelect }: { field: ChannelField; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Banner s={9} tk={0.14} c={C.sun300}>
        {field.label}
      </Banner>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
        {(field.options || []).map((o) => {
          const on = value === o;
          return (
            <Pressable
              key={o}
              onPress={() => onSelect(o)}
              style={{ borderWidth: 2, borderColor: C.ink100, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11, backgroundColor: on ? C.sun400 : 'transparent' }}
            >
              <Banner s={9.5} tk={0.04} c={on ? C.inkDeep : C.ink100}>
                {o}
              </Banner>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChannelComposer() {
  const insets = useSafeAreaInsets();
  const tag = useStore((s) => s.activeChannel);
  const draftKind = useStore((s) => s.channelDraftKind);
  const draft = useStore((s) => s.channelDraft);
  const setKind = useStore((s) => s.setChannelDraftKind);
  const setField = useStore((s) => s.setChannelDraftField);
  const post = useStore((s) => s.postToChannel);
  const close = useStore((s) => s.closeChannelComposer);

  if (!tag) return null;
  const ch = CHANNELS.find((c) => c.tag === tag);
  const form = channelForm(tag);
  const hasContent = Object.values(draft).some((v) => v && v.trim());

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 58 }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SheetUp style={{ backgroundColor: C.inkBlack, borderTopWidth: 2.5, borderColor: C.sun400, paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 18, maxHeight: 640 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Display s={20} c={C.sun400}>
              {tag}
            </Display>
            <Pressable onPress={close}>
              <Mono s={12} c={C.ink200}>
                Cerrar ✕
              </Mono>
            </Pressable>
          </View>
          <SerifItalic s={12} c={C.ink100} style={{ marginTop: 4, marginBottom: 14 }}>
            {tag === '#DINECLUB' ? 'Escribe como hablas. Específico gana.' : 'Geo-sello obligatorio · sé específico o no publiques.'}
          </SerifItalic>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            {form.map((f) => {
              if (f.key === 'kind') {
                if ((f.options || []).length <= 1) return null; // a fixed tag (e.g. EVENTO)
                return <KindRow key="kind" options={f.options || []} value={draftKind} onSelect={setKind} />;
              }
              if (f.kind === 'choice') {
                return <ChoiceRow key={f.key} field={f} value={draft[f.key] || ''} onSelect={(v) => setField(f.key, v)} />;
              }
              return (
                <View key={f.key} style={{ marginBottom: 14 }}>
                  <Banner s={9} tk={0.14} c={C.sun300}>
                    {f.label}
                  </Banner>
                  <TextInput
                    value={draft[f.key] || ''}
                    onChangeText={(v) => setField(f.key, v)}
                    placeholder={f.placeholder || ''}
                    placeholderTextColor={C.inkSoft}
                    multiline={f.multiline}
                    style={inputStyle(f.multiline)}
                  />
                </View>
              );
            })}
          </ScrollView>

          <StickerPressable
            offset="sm"
            radius={999}
            onPress={hasContent ? post : () => {}}
            disabled={!hasContent}
            style={{ marginTop: 10, alignItems: 'center', borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 14, opacity: hasContent ? 1 : 0.45 }}
          >
            <Banner s={13} tk={0.1} c={C.inkDeep}>
              Publicar en {ch?.tag}
            </Banner>
          </StickerPressable>
          <Mono s={8.5} c={C.ink200} style={{ textAlign: 'center', marginTop: 10 }}>
            Se paga la cuenta · se juzga el plato, nunca a la persona
          </Mono>
        </SheetUp>
      </View>
    </View>
  );
}
