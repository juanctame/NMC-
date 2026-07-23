/**
 * NO MAD CORNER — app entry. Loads the brand + Google fonts, holds the splash
 * until they're ready, then renders the app surface inside a safe-area provider.
 */
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { FONT_ASSETS } from './src/theme/fonts';
import { C } from './src/theme/tokens';
import { useStore } from './src/store/useStore';
import { Root } from './src/Root';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Bar() {
  const screen = useStore((s) => s.screen);
  const dark = screen === 'club' || screen === 'reel';
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function App() {
  const [loaded, error] = useFonts(FONT_ASSETS);
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);

  // Load any stored account before the first paint (decides onboarding vs feed).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const ready = (loaded || !!error) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.paper50 }} onLayout={onLayout}>
        <Bar />
        <Root />
      </View>
    </SafeAreaProvider>
  );
}
