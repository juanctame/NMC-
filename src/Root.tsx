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
import { ReviewComposer } from './overlays/ReviewComposer';

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
import { Channel } from './screens/Channel';
import { FoodieProfile } from './screens/FoodieProfile';
import { ChefProfile } from './screens/ChefProfile';
import { GroupProfile } from './screens/GroupProfile';
import { CriticProfile } from './screens/CriticProfile';
import { Decide } from './screens/Decide';
import { Clips } from './screens/Clips';
import { NearbyMap } from './screens/NearbyMap';
import { Reel } from './screens/Reel';

import { RankFlow } from './overlays/RankFlow';
import { AttachSheet } from './overlays/AttachSheet';
import { CreateTable } from './overlays/CreateTable';
import { ChannelComposer } from './overlays/ChannelComposer';
import { TasteCard } from './overlays/TasteCard';
import { PhotoImport } from './overlays/PhotoImport';
import { ImportHub } from './overlays/ImportHub';
import { VideoOverlay } from './components/VideoOverlay';
import { DecideFab } from './components/DecideFab';
import { TopFourPicker } from './overlays/TopFourPicker';
import { favoritesFromRanked, publishFavorites } from './data/favorites';
import { ErrorBoundary, installGlobalErrorReporting } from './components/ErrorBoundary';
import { StatusBanner } from './components/StatusBanner';
import { identity } from './data/profile';

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
  channel: Channel,
  foodie: FoodieProfile,
  chef: ChefProfile,
  group: GroupProfile,
  critic: CriticProfile,
  decide: Decide,
  clips: Clips,
  map: NearbyMap,
  reel: Reel,
};

const ROOT_TABS: Screen[] = ['feed', 'log', 'board', 'you', 'table'];
/** Browsing sections that carry the "Can't decide?" corner button. */
const DECIDE_SCREENS: Screen[] = ['feed', 'log', 'board', 'table'];

export function Root() {
  const screen = useStore((s) => s.screen);
  useEffect(() => installGlobalErrorReporting(() => useStore.getState().screen), []);
  const rankOpen = useStore((s) => s.rankOpen);
  const attachOpen = useStore((s) => s.attachOpen);
  const createOpen = useStore((s) => s.createOpen);
  const citySheetOpen = useStore((s) => s.citySheetOpen);
  const reviewOpen = useStore((s) => s.reviewOpen);
  const videoOpen = useStore((s) => !!s.videoUrl);
  const channelComposerOpen = useStore((s) => s.channelComposerOpen);
  const tasteCardOpen = useStore((s) => s.tasteCardOpen);
  const photoImportOpen = useStore((s) => s.photoImportOpen);
  const importOpen = useStore((s) => s.importOpen);
  const nearbyStatus = useStore((s) => s.nearbyStatus);
  const loadNearby = useStore((s) => s.loadNearby);
  const hasPlaces = useStore((s) => s.nearby.length > 0);
  const loadDecideState = useStore((s) => s.loadDecideState);
  const loadTopFourState = useStore((s) => s.loadTopFourState);
  const topPickerOpen = useStore((s) => !!s.topPicker);
  const topFour = useStore((s) => s.topFour);
  const ranked = useStore((s) => s.ranked);
  const profile = useStore((s) => s.profile);

  // Today's "Can't decide?" swipes / pick, and your Top 4, remembered on the device.
  useEffect(() => {
    loadDecideState();
    loadTopFourState();
  }, [loadDecideState, loadTopFourState]);

  const cloudState = useStore((s) => s.cloud);
  // Publish your favourites + Top 4 so you show up among each place's biggest fans
  // for other testers (no-op until the shared `favorites` table exists).
  useEffect(() => {
    if (!profile?.handle || cloudState !== 'synced') return;
    const t = setTimeout(() => {
      const me = identity(profile);
      void publishFavorites({ handle: me.handle, name: me.name, initials: me.initials, color: me.color, avatarUrl: me.avatarUrl }, favoritesFromRanked(ranked), topFour);
    }, 2500);
    return () => clearTimeout(t);
  }, [profile, ranked, topFour, cloudState]);

  // Pull live places for the selected city on first launch.
  useEffect(() => {
    if (nearbyStatus === 'idle') loadNearby();
  }, [nearbyStatus, loadNearby]);

  const Active = SCREENS[screen] ?? Feed;
  const anyOverlay = topPickerOpen || rankOpen || attachOpen || createOpen || citySheetOpen || reviewOpen || videoOpen || channelComposerOpen || tasteCardOpen || photoImportOpen;
  const showTabBar = ROOT_TABS.includes(screen) && !anyOverlay;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper50 }}>
      <ErrorBoundary screen={screen} onRecover={() => useStore.setState({ screen: 'feed', tab: 'feed', profileStack: [] })}>
        <Active />
      </ErrorBoundary>
      {showTabBar ? <TabBar /> : null}
      <StatusBanner />
      {showTabBar && hasPlaces && DECIDE_SCREENS.includes(screen) ? <DecideFab /> : null}
      {rankOpen ? <RankFlow /> : null}
      {attachOpen ? <AttachSheet /> : null}
      {createOpen ? <CreateTable /> : null}
      {citySheetOpen ? <CitySheet /> : null}
      {reviewOpen ? <ReviewComposer /> : null}
      {channelComposerOpen ? <ChannelComposer /> : null}
      {tasteCardOpen ? <TasteCard /> : null}
      {importOpen ? <ImportHub /> : null}
      {photoImportOpen ? <PhotoImport /> : null}
      {topPickerOpen ? <TopFourPicker /> : null}
      <VideoOverlay />
    </View>
  );
}
