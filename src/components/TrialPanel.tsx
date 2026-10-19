/**
 * Trial & sync — where your data lives, honestly: on the server (synced, with
 * when), or on this device only (and why). Sync on demand, keep it on every
 * device with Google, see the trial's live numbers, the build you're on, and
 * send feedback straight to the team.
 */
import React, { useEffect, useState } from "react";
import { View, TextInput } from "react-native";
import { useStore } from "../store/useStore";
import {
  APP_VERSION,
  fetchTrialStats,
  sendFeedback,
  type TrialStats,
} from "../data/cloud";
import { googleAuthEnabled } from "../data/auth";
import { C } from "../theme/tokens";
import { Banner, Mono, Serif } from "./Text";
import { StickerPressable } from "./Sticker";

const LABEL: Record<string, { t: string; c: string }> = {
  synced: { t: "● Synced", c: C.stampGreen },
  connecting: { t: "◌ Connecting…", c: C.inkMuted },
  local: { t: "◐ This device only", c: C.ink400 },
  offline: { t: "◐ Offline — will sync", c: C.ink400 },
  off: { t: "○ This device only", c: C.inkMuted },
};

function ago(ts: number | null): string {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} min ago`
      : `${Math.round(m / 60)} h ago`;
}

export function TrialPanel() {
  const state = useStore((s) => s.cloud);
  const note = useStore((s) => s.cloudNote);
  const syncedAt = useStore((s) => s.syncedAt);
  const syncNow = useStore((s) => s.syncNow);
  const authUser = useStore((s) => s.authUser);
  const profile = useStore((s) => s.profile);
  const signInWithGoogle = useStore((s) => s.signInWithGoogle);
  const screen = useStore((s) => s.screen);
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [fb, setFb] = useState("");
  const [fbState, setFbState] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");

  useEffect(() => {
    let live = true;
    fetchTrialStats().then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, [state]);

  const l = LABEL[state] || LABEL.off;
  const onGoogle = !!authUser && !authUser.anonymous && !!authUser.email;
  const send = async () => {
    if (!fb.trim() || fbState === "sending") return;
    setFbState("sending");
    const ok = await sendFeedback(fb, screen, profile?.handle);
    setFbState(ok ? "sent" : "failed");
    if (ok) setFb("");
  };

  return (
    <View
      accessibilityLabel="Trial and sync"
      style={{
        backgroundColor: C.paper0,
        borderWidth: 2,
        borderColor: C.inkBlack,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Banner s={10.5} tk={0.06} c={l.c} style={{ flex: 1 }}>
          {l.t}
          {state === "synced" && syncedAt ? ` · ${ago(syncedAt)}` : ""}
        </Banner>
        {profile && state !== "off" ? (
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => void syncNow()}
            accessibilityLabel="Sync now"
            style={{
              borderWidth: 2,
              borderColor: C.inkBlack,
              borderRadius: 999,
              backgroundColor: C.paper0,
              paddingVertical: 5,
              paddingHorizontal: 11,
            }}
          >
            <Banner s={8.5} tk={0.1} c={C.inkDeep}>
              Sync now
            </Banner>
          </StickerPressable>
        ) : null}
      </View>
      <Mono s={8.5} c={C.inkMuted} style={{ lineHeight: 13 }}>
        {state === "synced"
          ? onGoogle
            ? `Your passport, list and follows are saved to your account (${authUser!.email}) and load on any device.`
            : "Saved to the server under this device’s account. Continue with Google to keep it on every device."
          : note ||
            "Everything you do is saved on this device. It goes to the server once the trial backend is reachable."}
      </Mono>
      {profile && !onGoogle && googleAuthEnabled() ? (
        <View style={{ alignSelf: "flex-start" }}>
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={signInWithGoogle}
            accessibilityLabel="Continue with Google"
            style={{
              borderWidth: 2,
              borderColor: C.inkBlack,
              borderRadius: 999,
              backgroundColor: C.sun400,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Banner s={9} tk={0.08} c={C.inkDeep}>
              Continue with Google
            </Banner>
          </StickerPressable>
        </View>
      ) : null}

      {stats ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 1.5,
            borderColor: C.ink100,
            paddingTop: 8,
          }}
        >
          {[
            [stats.people, "people"],
            [stats.active_today, "today"],
            [stats.rankings, "rankings"],
            [stats.suggestions, "spots sent"],
          ].map(([v, k]) => (
            <View key={k as string} style={{ alignItems: "center" }}>
              <Banner s={13} c={C.ink400}>
                {v as number}
              </Banner>
              <Mono s={7.5} c={C.inkMuted}>
                {k as string}
              </Mono>
            </View>
          ))}
        </View>
      ) : null}

      {profile && state === "synced" ? (
        <View
          style={{
            gap: 6,
            borderTopWidth: 1.5,
            borderColor: C.ink100,
            paddingTop: 8,
          }}
        >
          <Serif s={12} c={C.inkDeep}>
            Something off, or a spot we’re missing? Tell the team.
          </Serif>
          <TextInput
            value={fb}
            onChangeText={(t) => {
              setFb(t);
              if (fbState !== "sending") setFbState("idle");
            }}
            placeholder="Your feedback…"
            multiline
            maxLength={2000}
            accessibilityLabel="Feedback"
            style={{
              minHeight: 56,
              borderWidth: 1.5,
              borderColor: C.inkSoft,
              padding: 8,
              fontSize: 13,
              color: C.inkDeep,
              backgroundColor: C.paper50,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StickerPressable
              offset="sm"
              radius={999}
              onPress={send}
              accessibilityLabel="Send feedback"
              style={{
                borderWidth: 2,
                borderColor: C.inkBlack,
                borderRadius: 999,
                backgroundColor: C.paper0,
                paddingVertical: 5,
                paddingHorizontal: 12,
              }}
            >
              <Banner s={8.5} tk={0.1} c={C.inkDeep}>
                {fbState === "sending" ? "Sending…" : "Send"}
              </Banner>
            </StickerPressable>
            <Mono s={8.5} c={fbState === "failed" ? C.ink400 : C.stampGreen}>
              {fbState === "sent"
                ? "Thanks — the team got it."
                : fbState === "failed"
                  ? "Couldn’t send — try again in a bit."
                  : ""}
            </Mono>
          </View>
        </View>
      ) : null}

      <Mono s={7.5} c={C.inkSoft}>
        CRTQ trial · build {APP_VERSION}
      </Mono>
    </View>
  );
}
