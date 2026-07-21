/**
 * Root surface. Renders the active screen (driven by the store's `screen`),
 * the persistent bottom tab bar on the five root tabs, and the overlay layer
 * (rank flow, attach sheet, create-table sheet) above everything.
 */
import React from 'react';
import { View } from 'react-native';
import { useStore, type Screen } from './store/useStore';
import { C } from './theme/tokens';
import { TabBar } from './components/TabBar';

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

  const Active = SCREENS[screen] ?? Feed;
  const showTabBar = ROOT_TABS.includes(screen) && !rankOpen && !attachOpen && !createOpen;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper50 }}>
      <Active />
      {showTabBar ? <TabBar /> : null}
      {rankOpen ? <RankFlow /> : null}
      {attachOpen ? <AttachSheet /> : null}
      {createOpen ? <CreateTable /> : null}
    </View>
  );
}
