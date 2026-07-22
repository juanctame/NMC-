/**
 * Root surface. Renders the active screen (driven by the store's `screen`),
 * the persistent bottom tab bar on the five root tabs, and the overlay layer
 * (rank flow, attach sheet, create-table sheet) above everything.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useStore, type Screen } from './store/useStore';
import { C } from './theme/tokens';
import { TabBar } from './components/TabBar';
import { CitySheet } from './overlays/CitySheet';

import { Feed } from './screens/Feed';
import { Log } from './screens/Log';
import { Leaderboard } from './screens/Leaderboard';
import { Passport } from './screens/Passport';
import { PlaceDetail } from './screens/PlaceDetail';
import { Onboarding } from './screens/Onboarding';
import { Table } from './screens/Table';
import { EventDetail } from './screens/EventDetail';
import { Ticket } from './screens/Ticket';
import { Thread } from './screens/Thread';
import { DineClub } from './screens/DineClub';
import { NearbyMap } from './screens/NearbyMap';
import { Reel } from './screens/Reel';

import { RankFlow } from './overlays/RankFlow';
import { AttachSheet } from './overlays/AttachSheet';
import { CreateTable } from './overlays/CreateTable';

const SCREENS: Record<Screen, React.ComponentType> = {
  feed: Feed,
  log: Log,
  board: Leaderboard,
  you: Passport,
  place: PlaceDetail,
  onboard: Onboarding,
  table: Table,
  event: EventDetail,
  ticket: Ticket,
  thread: Thread,
  club: DineClub,
  map: NearbyMap,
  reel: Reel,
};

const ROOT_TABS: Screen[] = ['feed', 'log', 'board', 'you', 'table'];

export function Root() {
  const screen = useStore((s) => s.screen);
  const rankOpen = useStore((s) => s.rankOpen);
  const attachOpen = useStore((s) => s.attachOpen);
  const createOpen = useStore((s) => s.createOpen);
  const citySheetOpen = useStore((s) => s.citySheetOpen);
  const nearbyStatus = useStore((s) => s.nearbyStatus);
  const loadNearby = useStore((s) => s.loadNearby);

  // Pull live places for the selected city on first launch.
  useEffect(() => {
    if (nearbyStatus === 'idle') loadNearby();
  }, [nearbyStatus, loadNearby]);

  const Active = SCREENS[screen] ?? Feed;
  const anyOverlay = rankOpen || attachOpen || createOpen || citySheetOpen;
  const showTabBar = ROOT_TABS.includes(screen) && !anyOverlay;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper50 }}>
      <Active />
      {showTabBar ? <TabBar /> : null}
      {rankOpen ? <RankFlow /> : null}
      {attachOpen ? <AttachSheet /> : null}
      {createOpen ? <CreateTable /> : null}
      {citySheetOpen ? <CitySheet /> : null}
    </View>
  );
}
