/**
 * If a screen crashes, show a calm way back instead of a blank page — and send
 * the error to the trial's crash reports (cloud.ts). Resets when the screen
 * changes. Also reports uncaught errors and failed promises app-wide (web).
 */
import React from 'react';
import { View, Platform } from 'react-native';
import { reportError } from '../data/cloud';
import { C } from '../theme/tokens';
import { Banner, Display, Serif, Mono } from './Text';
import { StickerPressable } from './Sticker';

type Props = { screen: string; onRecover: () => void; children: React.ReactNode };
type State = { error: Error | null; forScreen: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, forScreen: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Moving to another screen clears a previous crash.
    if (state.error && props.screen !== state.forScreen) return { error: null, forScreen: props.screen };
    if (!state.error && props.screen !== state.forScreen) return { forScreen: props.screen };
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const e = Object.assign(new Error(error.message), { stack: `${error.stack || ''}\n--- component stack ---${info.componentStack || ''}` });
    void reportError(e, this.props.screen);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View accessibilityLabel="Something went wrong" style={{ flex: 1, backgroundColor: C.paper50, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
        <Display s={30} c={C.ink400}>
          Oops.
        </Display>
        <Serif s={15} c={C.inkDeep} style={{ textAlign: 'center', lineHeight: 21 }}>
          This page tripped over something. Your passport and list are safe — the team has been sent the details.
        </Serif>
        <StickerPressable
          offset="sm"
          radius={999}
          onPress={() => {
            this.setState({ error: null });
            this.props.onRecover();
          }}
          accessibilityLabel="Back to the feed"
          style={{ borderWidth: 2, borderColor: C.inkBlack, borderRadius: 999, backgroundColor: C.sun400, paddingVertical: 9, paddingHorizontal: 18 }}
        >
          <Banner s={11} tk={0.1} c={C.inkDeep}>
            Back to the feed
          </Banner>
        </StickerPressable>
        <Mono s={8} c={C.inkSoft} numberOfLines={2} style={{ textAlign: 'center' }}>
          {this.state.error.message}
        </Mono>
      </View>
    );
  }
}

let installed = false;
/** Report uncaught errors + unhandled promise rejections (web). */
export function installGlobalErrorReporting(screen: () => string): void {
  if (installed || Platform.OS !== 'web' || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (ev) => {
    // Cross-origin script noise ("Script error.") carries nothing useful.
    if (ev.message && ev.message !== 'Script error.') void reportError(ev.error || new Error(ev.message), screen());
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const r = (ev as PromiseRejectionEvent).reason;
    if (r && String(r.name) !== 'AbortError') void reportError(r instanceof Error ? r : new Error(String(r)), screen());
  });
}
