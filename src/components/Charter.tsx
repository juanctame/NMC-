/**
 * El código — the CRTQ members' charter, rendered on the Dine Club's dark
 * field. A section index (00–07) up top switches between the parts of the
 * founding text; each part lays out its rules, tables and channel templates in
 * the club's exclusive, near-black styling. Content lives in ../data/charter.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { C } from '../theme/tokens';
import { Display, Banner, Serif, SerifItalic, Mono } from './Text';
import { StickerView } from './Sticker';
import {
  CHARTER_INDEX,
  WHAT_PARAS,
  WHAT_LANG,
  HOUSE_INTRO,
  HOUSE_RULES,
  VERDICT_INTRO,
  VERDICTS,
  AVISO_PARAS,
  CHANNELS,
  DINECLUB_INTRO,
  FORMATS,
  FORMATS_NOTE,
  TIMELINE,
  DINECLUB_RULES,
  DINECLUB_BECOME,
  ROLES,
  MOD_INTRO,
  MOD_IMMEDIATE_LEAD,
  MOD_IMMEDIATE,
  MOD_REPLY,
  NOT_LEAD,
  NOT_LIST,
  NOT_CLOSER,
  CHARTER_SIGN,
  CHARTER_TAGLINE,
  type Rule,
  type Channel,
} from '../data/charter';

/* ── shared bits ── */

function Head({ id, title }: { id: string; title: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Display s={40} c={C.ink400} style={{ lineHeight: 40 }}>
        {id}
      </Display>
      <Display s={22} c={C.paper0} style={{ marginTop: 2, lineHeight: 24 }}>
        {title}
      </Display>
      <View style={{ height: 3, width: 46, backgroundColor: C.sun400, marginTop: 10 }} />
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Serif s={13.5} c={C.ink100} style={{ lineHeight: 21, marginBottom: 11 }}>
      {children}
    </Serif>
  );
}

function Label({ children, color = C.sun300 }: { children: React.ReactNode; color?: string }) {
  return (
    <Banner s={9.5} tk={0.16} c={color} style={{ marginBottom: 8 }}>
      {children}
    </Banner>
  );
}

function RuleItem({ rule }: { rule: Rule }) {
  return (
    <View style={{ flexDirection: 'row', gap: 11, marginBottom: 12 }}>
      <Display s={12} c={C.sun400} style={{ width: 34, paddingTop: 2 }}>
        {rule.n.replace('Nº', '')}
      </Display>
      <Serif s={13} c={C.ink100} style={{ flex: 1, lineHeight: 20 }}>
        {rule.body}
      </Serif>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 8 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink400, marginTop: 7 }} />
      <Serif s={12.5} c={C.ink100} style={{ flex: 1, lineHeight: 19 }}>
        {children}
      </Serif>
    </View>
  );
}

/** A form template rendered as a stamped monospace slip. */
function Template({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View style={{ borderWidth: 1.5, borderColor: C.sun400, backgroundColor: 'rgba(0,0,0,0.35)', padding: 12, marginTop: 10, marginBottom: 10 }}>
      {lines.map((l, i) => (
        <Mono key={i} s={11} c={i === 0 ? C.sun300 : C.ink100} style={{ lineHeight: 18 }}>
          {l}
        </Mono>
      ))}
    </View>
  );
}

function ChannelBlock({ ch }: { ch: Channel }) {
  return (
    <StickerView offset="sm" style={{ backgroundColor: C.ink700, borderWidth: 2, borderColor: C.paper0, padding: 15, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Display s={19} c={C.sun400}>
          {ch.tag}
        </Display>
        <Banner s={10} tk={0.08} c={C.paper0}>
          {ch.name}
        </Banner>
      </View>
      <Serif s={13} c={C.ink100} style={{ lineHeight: 20, marginTop: 8 }}>
        {ch.intro}
      </Serif>
      <View style={{ marginTop: 10 }}>
        <Banner s={8.5} tk={0.14} c={C.stampGreen}>
          Qué va
        </Banner>
        <Serif s={12.5} c={C.ink100} style={{ lineHeight: 19, marginTop: 3 }}>
          {ch.goes}
        </Serif>
      </View>
      <View style={{ marginTop: 8 }}>
        <Banner s={8.5} tk={0.14} c={C.ink300}>
          Qué no va
        </Banner>
        <Serif s={12.5} c={C.ink200} style={{ lineHeight: 19, marginTop: 3 }}>
          {ch.notGoes}
        </Serif>
      </View>
      <Template lines={ch.template} />
      {ch.rules.length ? (
        <View style={{ marginTop: 4 }}>
          <Banner s={8.5} tk={0.14} c={C.sun300} style={{ marginBottom: 6 }}>
            Reglas del canal
          </Banner>
          {ch.rules.map((r, i) => (
            <Bullet key={i}>{r}</Bullet>
          ))}
        </View>
      ) : null}
    </StickerView>
  );
}

/* ── section bodies ── */

function SectionWhat() {
  return (
    <>
      <Head id="00" title="Qué es CRTQ" />
      {WHAT_PARAS.map((p, i) => (
        <Para key={i}>{p}</Para>
      ))}
      <StickerView offset="sm" style={{ backgroundColor: C.sun400, borderWidth: 2, borderColor: C.paper0, padding: 13, marginTop: 4 }}>
        <Serif s={13} c={C.inkDeep} style={{ lineHeight: 20 }}>
          {WHAT_LANG}
        </Serif>
      </StickerView>
    </>
  );
}

function SectionHouse() {
  return (
    <>
      <Head id="01" title="Las reglas de la casa" />
      <SerifItalic s={13} c={C.sun300} style={{ marginBottom: 16 }}>
        {HOUSE_INTRO}
      </SerifItalic>
      {HOUSE_RULES.map((r) => (
        <RuleItem key={r.n} rule={r} />
      ))}
    </>
  );
}

function SectionVerdict() {
  return (
    <>
      <Head id="02" title="El sistema de veredicto" />
      <Para>{VERDICT_INTRO}</Para>
      {VERDICTS.map((v) => (
        <StickerView key={v.name} offset="sm" style={{ backgroundColor: C.ink700, borderWidth: 2, borderColor: C.paper0, padding: 13, marginBottom: 10 }}>
          <Banner s={13} tk={0.06} c={C.sun400}>
            {v.name}
          </Banner>
          <Serif s={12.5} c={C.ink100} style={{ lineHeight: 19, marginTop: 5 }}>
            {v.meaning}
          </Serif>
        </StickerView>
      ))}
      <View style={{ borderLeftWidth: 3, borderColor: C.ink400, paddingLeft: 12, marginTop: 8 }}>
        <Banner s={9.5} tk={0.14} c={C.ink300} style={{ marginBottom: 8 }}>
          Sobre lo negativo · el AVISO
        </Banner>
        {AVISO_PARAS.map((p, i) => (
          <Serif key={i} s={12.5} c={C.ink100} style={{ lineHeight: 20, marginBottom: 9 }}>
            {p}
          </Serif>
        ))}
      </View>
    </>
  );
}

function SectionChannels() {
  return (
    <>
      <Head id="03" title="Los canales" />
      {CHANNELS.map((ch) => (
        <ChannelBlock key={ch.tag} ch={ch} />
      ))}
    </>
  );
}

function SectionDineClub() {
  return (
    <>
      <Head id="04" title="DINE CLUB" />
      <SerifItalic s={14} c={C.sun300} style={{ marginBottom: 12, lineHeight: 21 }}>
        {DINECLUB_INTRO[0]}
      </SerifItalic>
      {DINECLUB_INTRO.slice(1).map((p, i) => (
        <Para key={i}>{p}</Para>
      ))}

      <Label>Los cinco formatos</Label>
      {FORMATS.map((f) => (
        <View key={f.name} style={{ flexDirection: 'row', gap: 10, marginBottom: 11 }}>
          <View style={{ width: 82 }}>
            <Banner s={11} tk={0.04} c={C.sun400}>
              {f.name}
            </Banner>
          </View>
          <View style={{ flex: 1 }}>
            <Serif s={12.5} c={C.ink100} style={{ lineHeight: 19 }}>
              {f.what}
            </Serif>
            <Mono s={9.5} c={C.sun300} style={{ marginTop: 3 }}>
              ↳ {f.leaves}
            </Mono>
          </View>
        </View>
      ))}
      {FORMATS_NOTE.map((p, i) => (
        <SerifItalic key={i} s={12.5} c={C.ink200} style={{ lineHeight: 20, marginTop: 4, marginBottom: 8 }}>
          {p}
        </SerifItalic>
      ))}

      <View style={{ height: 8 }} />
      <Label>Cómo funciona</Label>
      {TIMELINE.map((t) => (
        <View key={t.day} style={{ flexDirection: 'row', gap: 10, marginBottom: 9 }}>
          <View style={{ width: 74 }}>
            <Mono s={10} c={C.sun400}>
              {t.day}
            </Mono>
          </View>
          <Serif s={12.5} c={C.ink100} style={{ flex: 1, lineHeight: 19 }}>
            {t.what}
          </Serif>
        </View>
      ))}

      <View style={{ height: 10 }} />
      <Label>Reglas de DINE CLUB</Label>
      {DINECLUB_RULES.map((r) => (
        <RuleItem key={r.n} rule={r} />
      ))}

      <View style={{ height: 6 }} />
      <Label>Lo que DINE CLUB puede convertirse</Label>
      <Para>{DINECLUB_BECOME}</Para>
    </>
  );
}

function SectionRoles() {
  return (
    <>
      <Head id="05" title="Roles" />
      {ROLES.map((r) => (
        <StickerView key={r.name} offset="sm" style={{ backgroundColor: C.ink700, borderWidth: 2, borderColor: C.paper0, padding: 13, marginBottom: 10 }}>
          <Banner s={12} tk={0.06} c={C.sun400}>
            {r.name}
          </Banner>
          <Serif s={12.5} c={C.ink100} style={{ lineHeight: 19, marginTop: 5 }}>
            {r.body}
          </Serif>
        </StickerView>
      ))}
    </>
  );
}

function SectionMod() {
  return (
    <>
      <Head id="06" title="Moderación" />
      <SerifItalic s={14} c={C.sun300} style={{ marginBottom: 14, lineHeight: 21 }}>
        {MOD_INTRO}
      </SerifItalic>
      <Banner s={9.5} tk={0.14} c={C.ink300} style={{ marginBottom: 10 }}>
        {MOD_IMMEDIATE_LEAD}
      </Banner>
      {MOD_IMMEDIATE.map((m, i) => (
        <Bullet key={i}>{m}</Bullet>
      ))}
      <View style={{ height: 8 }} />
      <Para>{MOD_REPLY}</Para>
    </>
  );
}

function SectionNot() {
  return (
    <>
      <Head id="07" title="Lo que CRTQ no es" />
      <Banner s={9.5} tk={0.14} c={C.sun300} style={{ marginBottom: 12 }}>
        {NOT_LEAD}
      </Banner>
      {NOT_LIST.map((n, i) => (
        <Display key={i} s={16} c={C.paper0} style={{ marginBottom: 8, lineHeight: 20 }}>
          {n}
        </Display>
      ))}
      <View style={{ height: 8 }} />
      <SerifItalic s={15} c={C.sun300} style={{ lineHeight: 23, marginBottom: 20 }}>
        {NOT_CLOSER}
      </SerifItalic>
      <View style={{ borderTopWidth: 2, borderColor: C.ink700, paddingTop: 16 }}>
        <Mono s={10} c={C.ink200} style={{ textAlign: 'center' }}>
          {CHARTER_SIGN}
        </Mono>
        <Banner s={11} tk={0.18} c={C.sun400} style={{ textAlign: 'center', marginTop: 10 }}>
          {CHARTER_TAGLINE}
        </Banner>
      </View>
    </>
  );
}

const SECTIONS = [
  SectionWhat,
  SectionHouse,
  SectionVerdict,
  SectionChannels,
  SectionDineClub,
  SectionRoles,
  SectionMod,
  SectionNot,
];

export function Charter() {
  const [sec, setSec] = useState(0);
  const Active = SECTIONS[sec] ?? SectionWhat;
  return (
    <View>
      {/* section index */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingBottom: 4, paddingRight: 8 }}
        style={{ marginBottom: 16 }}
      >
        {CHARTER_INDEX.map((s, i) => {
          const on = i === sec;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSec(i)}
              accessibilityLabel={`Sección ${s.id} ${s.short}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderWidth: 2,
                borderColor: on ? C.sun400 : C.ink700,
                backgroundColor: on ? C.sun400 : 'transparent',
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 11,
              }}
            >
              <Mono s={9} c={on ? C.inkDeep : C.sun400}>
                {s.id}
              </Mono>
              <Banner s={9} tk={0.06} c={on ? C.inkDeep : C.ink100}>
                {s.short}
              </Banner>
            </Pressable>
          );
        })}
      </ScrollView>

      <Active />
    </View>
  );
}
