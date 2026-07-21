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

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  const onLayout = useCallback(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.paper50 }} onLayout={onLayout}>
        <Bar />
        <Root />
      </View>
    </SafeAreaProvider>
  );
}
