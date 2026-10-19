/**
 * Biggest fans — everyone whose favourite this restaurant is, category by
 * category (their top-ranked tacos, seafood, fine dining…), with the people who
 * feature it in their profile's Top 4 marked and listed first. You, your
 * friends and — with the shared backend — every other tester. Every fan is a
 * profile you can visit (yours opens your passport). Ends with the invitation
 * to feature it yourself. Below them, its supporters: people who keep it on
 * their shortlist (their Nº2 to Nº8 there) without crowning it.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useStore } from "../store/useStore";
import type { Place } from "../store/data";
import {
  fansOf,
  favoritesFromRanked,
  lovesFromRanked,
  supportersOf,
  fetchSharedFans,
  catLabel,
  FAV_CATS,
  categoryOf,
  type FanEntry,
} from "../data/favorites";
import { FanChip } from "./FanChip";
import { identity } from "../data/profile";
import { C, col } from "../theme/tokens";
import { Banner, Mono, Serif, Display } from "./Text";
import { StickerView, StickerPressable } from "./Sticker";

function Avatar({ e }: { e: FanEntry }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: col(e.fan.color),
        borderWidth: 2,
        borderColor: C.inkBlack,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {e.fan.avatarUrl ? (
        <Image
          source={{ uri: e.fan.avatarUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      ) : (
        <Banner s={10} c={C.paper0}>
          {e.fan.initials}
        </Banner>
      )}
    </View>
  );
}

export function BiggestFans({ place }: { place: Place }) {
  const ranked = useStore((s) => s.ranked);
  const topFour = useStore((s) => s.topFour);
  const profile = useStore((s) => s.profile);
  const openFoodie = useStore((s) => s.openFoodie);
  const openMyProfile = useStore((s) => s.openMyProfile);
  const openTopPicker = useStore((s) => s.openTopPicker);
  const [shared, setShared] = useState<
    Awaited<ReturnType<typeof fetchSharedFans>>
  >([]);

  const me = identity(profile);
  useEffect(() => {
    let live = true;
    fetchSharedFans(place.id, profile?.handle).then(
      (r) => live && setShared(r),
    );
    return () => {
      live = false;
    };
  }, [place.id, profile?.handle]);

  const groups = useMemo(
    () =>
      fansOf(
        place.id,
        {
          fan: {
            id: "me",
            name: "You",
            initials: me.initials,
            color: me.color,
            avatarUrl: me.avatarUrl,
            kind: "me",
          },
          favorites: favoritesFromRanked(ranked),
          top: topFour,
        },
        shared,
      ),
    [place.id, ranked, topFour, shared, me.initials, me.color, me.avatarUrl],
  );
  const supporters = useMemo(
    () =>
      supportersOf(
        place.id,
        {
          fan: {
            id: "me",
            name: "You",
            initials: me.initials,
            color: me.color,
            avatarUrl: me.avatarUrl,
            kind: "me",
          },
          loves: lovesFromRanked(ranked),
        },
        groups,
      ),
    [place.id, ranked, groups, me.initials, me.color, me.avatarUrl],
  );
  const total = new Set(groups.flatMap((g) => g.fans.map((f) => f.fan.id)))
    .size;
  const count = [
    total && `${total} ${total === 1 ? "fan" : "fans"}`,
    supporters.length &&
      `${supporters.length} ${supporters.length === 1 ? "supporter" : "supporters"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const mySlot = topFour.findIndex((t) => t?.placeId === place.id);
  const cat = categoryOf(place);
  const glyph = (c: string) => FAV_CATS.find((x) => x.id === c)?.glyph || "♥";

  return (
    <View style={{ marginTop: 16 }} accessibilityLabel="Biggest fans">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          marginBottom: 8,
        }}
      >
        <Banner s={10} tk={0.14} c={C.inkMuted}>
          Biggest fans
        </Banner>
        <View style={{ flex: 1, height: 2, backgroundColor: C.ink100 }} />
        <Mono s={9} c={C.inkSoft}>
          {count || "none yet"}
        </Mono>
      </View>

      {groups.length ? (
        <View style={{ gap: 10 }}>
          {groups.map((g) => (
            <StickerView
              key={g.category}
              offset="sm"
              style={{
                backgroundColor: C.paper0,
                borderWidth: 2,
                borderColor: C.inkBlack,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  backgroundColor: C.sun100,
                  borderBottomWidth: 2,
                  borderColor: C.inkBlack,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                }}
              >
                <Display s={13} c={C.ink400}>
                  {glyph(g.category)}
                </Display>
                <Banner s={8.5} tk={0.14} c={C.inkDeep} style={{ flex: 1 }}>
                  Favourite · {catLabel(g.category)}
                </Banner>
                <Mono s={8.5} c={C.inkMuted}>
                  {g.fans.length}
                </Mono>
              </View>
              {g.fans.map((e, i) => {
                // Every fan is a profile you can visit — yours opens your passport.
                const visit = () =>
                  e.fan.kind === "me" ? openMyProfile() : openFoodie(e.fan.id);
                return (
                  <Pressable
                    key={e.fan.id}
                    onPress={visit}
                    accessibilityLabel={`Fan: ${e.fan.name}`}
                    accessibilityHint="Opens their profile"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderTopWidth: i ? 1.5 : 0,
                      borderColor: C.ink100,
                      backgroundColor:
                        e.fan.kind === "me" ? C.sun50 : undefined,
                    }}
                  >
                    <Avatar e={e} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Banner
                        s={10.5}
                        tk={0.03}
                        c={C.inkDeep}
                        numberOfLines={1}
                      >
                        {e.fan.name}
                      </Banner>
                      <Mono s={8.5} c={C.inkMuted} numberOfLines={1}>
                        {e.featured
                          ? `Featured in ${e.fan.kind === "me" ? "your" : "their"} Top 4${e.slot != null ? ` · Nº${e.slot + 1}` : ""}`
                          : `${e.fan.kind === "me" ? "Your" : "Their"} top-ranked ${catLabel(g.category).toLowerCase()}`}
                        {e.fan.kind === "community"
                          ? " · on CRTQ"
                          : e.fan.kind === "friend"
                            ? " · sample diner"
                            : ""}
                      </Mono>
                    </View>
                    {e.featured ? (
                      <View
                        style={{
                          backgroundColor: C.ink400,
                          borderWidth: 2,
                          borderColor: C.inkBlack,
                          paddingVertical: 2,
                          paddingHorizontal: 6,
                          transform: [{ rotate: "-4deg" }],
                        }}
                      >
                        <Banner s={7.5} tk={0.1} c={C.paper0}>
                          ★ Top 4
                        </Banner>
                      </View>
                    ) : null}
                    <Display s={13} c={C.inkSoft}>
                      →
                    </Display>
                  </Pressable>
                );
              })}
            </StickerView>
          ))}
        </View>
      ) : (
        <View
          style={{
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: C.inkSoft,
            padding: 12,
          }}
        >
          <Serif s={12.5} c={C.inkMuted} style={{ lineHeight: 18 }}>
            Nobody has crowned {place.name} their favourite{" "}
            {catLabel(cat).toLowerCase()} yet. Rank it at the top — or feature
            it in your Top 4 — to be its first fan.
          </Serif>
        </View>
      )}

      {supporters.length ? (
        <View style={{ marginTop: 12 }} accessibilityLabel="Supporters">
          <Mono s={8.5} c={C.inkMuted} style={{ marginBottom: 7 }}>
            Supporters — on their shortlist, just behind the crown
          </Mono>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {supporters.map((x) => (
              <FanChip
                key={x.fan.id}
                fan={x.fan}
                quiet
                line={`${x.fan.kind === "me" ? "Your" : "Their"} Nº${x.rank} ${catLabel(x.category).toLowerCase()}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      {mySlot >= 0 ? (
        <Mono s={9} c={C.stampGreen} style={{ marginTop: 8 }}>
          ★ In your Top 4 as Nº{mySlot + 1}
        </Mono>
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <StickerPressable
            offset="sm"
            radius={999}
            onPress={() => openTopPicker(null, place.id)}
            accessibilityLabel="Feature in my Top 4"
            style={{
              marginTop: 10,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: C.sun400,
              borderWidth: 2,
              borderColor: C.inkBlack,
              borderRadius: 999,
              paddingVertical: 7,
              paddingHorizontal: 13,
            }}
          >
            <Banner s={9.5} tk={0.08} c={C.inkDeep}>
              ★ Feature in my Top 4
            </Banner>
          </StickerPressable>
        </View>
      )}
    </View>
  );
}
