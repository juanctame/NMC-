/**
 * The marks every critic reading carries: the verdict stamp, its colours, and
 * the dashed "SIM" tag that says a score is CRTQ's simulated reading of a
 * creator's content, not a rating they gave.
 */
import React from 'react';
import { View } from 'react-native';
import { VERDICT_LABEL, type Verdict } from '../data/critics';
import { C } from '../theme/tokens';
import { Banner, Mono } from './Text';

export const VERDICT_COLOR: Record<Verdict, { bg: string; fg: string }> = {
  rave: { bg: C.ink400, fg: C.paper0 },
  acclaim: { bg: C.sun400, fg: C.inkDeep },
  recommends: { bg: C.stampGreen, fg: C.paper0 },
  features: { bg: C.paper0, fg: C.inkDeep },
  reports: { bg: C.paper0, fg: C.inkDeep },
  weighs: { bg: C.stampBlue, fg: C.paper0 },
  critical: { bg: C.inkDeep, fg: C.sun300 },
};

/** The "simulated" mark that travels with every CRTQ reading of a critic. */
export function SimTag({ dark }: { dark?: boolean }) {
  return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: dark ? C.sun300 : C.inkSoft, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 0.5 }}>
      <Mono s={7} c={dark ? C.sun300 : C.inkSoft}>
        SIM
      </Mono>
    </View>
  );
}

export function VerdictStamp({ v, small }: { v: Verdict; small?: boolean }) {
  const col = VERDICT_COLOR[v];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: col.bg, borderWidth: 2, borderColor: C.inkBlack, paddingVertical: small ? 1.5 : 2.5, paddingHorizontal: small ? 6 : 8, transform: [{ rotate: '-2deg' }] }}>
      <Banner s={small ? 7.5 : 8.5} tk={0.12} c={col.fg} numberOfLines={1}>
        {VERDICT_LABEL[v]}
      </Banner>
    </View>
  );
}

/** The house critic's mark: a real critic's ranking — their own scores, else CRTQ's reading of their own list. */
export function HouseTag({ dark }: { dark?: boolean }) {
  return (
    <View style={{ backgroundColor: dark ? C.stampGreen : C.paper0, borderWidth: 1.5, borderColor: dark ? C.paper0 : C.stampGreen, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 0.5 }}>
      <Mono s={7} c={dark ? C.paper0 : C.stampGreen}>
        HOUSE
      </Mono>
    </View>
  );
}
