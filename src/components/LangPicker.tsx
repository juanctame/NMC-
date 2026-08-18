/**
 * Flag language picker. A row of three stamped flag buttons — English 🇺🇸,
 * Español 🇲🇽, Français 🇫🇷 — that switch the app language on tap. The active
 * flag gets a sun-yellow fill and a hard sticker shadow so the current choice
 * reads at a glance. Placed on the onboarding cover and in the Passport.
 */
import React from 'react';
import { View, Pressable, Text as RNText } from 'react-native';
import { useStore } from '../store/useStore';
import { LANGUAGES, type Lang } from '../i18n';
import { C, R } from '../theme/tokens';
import { Banner } from './Text';

export function LangPicker({ showLabels = false, size = 40 }: { showLabels?: boolean; size?: number }) {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      {LANGUAGES.map((l) => {
        const active = lang === l.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLang(l.code as Lang)}
            accessibilityRole="button"
            accessibilityLabel={l.label}
            accessibilityState={{ selected: active }}
            style={{ alignItems: 'center', gap: 4 }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: R.pill,
                borderWidth: active ? 2.5 : 2,
                borderColor: C.inkBlack,
                backgroundColor: active ? C.sun400 : C.paper0,
                alignItems: 'center',
                justifyContent: 'center',
                // Signature hard-offset stamp shadow on the active flag.
                ...(active
                  ? {
                      shadowColor: C.inkBlack,
                      shadowOffset: { width: 2, height: 3 },
                      shadowOpacity: 0.9,
                      shadowRadius: 0,
                      elevation: 3,
                    }
                  : null),
                transform: active ? [{ rotate: '-4deg' }] : [{ rotate: '0deg' }],
                opacity: active ? 1 : 0.7,
              }}
            >
              <RNText
                allowFontScaling={false}
                style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}
              >
                {l.flag}
              </RNText>
            </View>
            {showLabels ? (
              <Banner s={9} tk={0.06} c={active ? C.ink400 : C.inkSoft}>
                {l.label}
              </Banner>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
