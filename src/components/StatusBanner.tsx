/**
 * One quiet strip at the top when something about freshness needs saying:
 * a newer build is live ("Refresh"), or you're offline (showing what's saved).
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { newerBuild, onEachUse } from '../data/live';
import { C } from '../theme/tokens';
import { Banner, Mono } from './Text';

export function StatusBanner() {
  const insets = useSafeAreaInsets();
  const [update, setUpdate] = useState(false);
  const [offline, setOffline] = useState(Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onEachUse(() => void newerBuild().then((v) => setUpdate(!!v))), []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (dismissed || (!update && !offline)) return null;
  return (
    <View
      accessibilityLabel={update ? 'Update available' : 'Offline'}
      style={{ position: 'absolute', top: insets.top + 6, left: 12, right: 12, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: update ? C.sun400 : C.inkDeep, borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 }}
    >
      <Mono s={9.5} c={update ? C.inkDeep : C.paper0} style={{ flex: 1 }} numberOfLines={2}>
        {update ? 'A newer CRTQ is live — fresh spots and fixes.' : 'You’re offline — showing what’s saved on this device.'}
      </Mono>
      {update ? (
        <Pressable onPress={() => typeof window !== 'undefined' && window.location.reload()} accessibilityLabel="Refresh to update" hitSlop={8}>
          <Banner s={9.5} tk={0.1} c={C.inkDeep}>
            Refresh
          </Banner>
        </Pressable>
      ) : null}
      <Pressable onPress={() => setDismissed(true)} accessibilityLabel="Dismiss" hitSlop={8}>
        <Banner s={11} c={update ? C.inkDeep : C.paper0}>
          ×
        </Banner>
      </Pressable>
    </View>
  );
}
