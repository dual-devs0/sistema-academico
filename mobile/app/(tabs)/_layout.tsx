import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue } from "react-native-reanimated";
import PagerView from "@expo/ui/community/pager-view";
import type {
  PagerViewRef,
  PagerViewOnPageSelectedEvent,
  PagerViewOnPageScrollEvent,
} from "@expo/ui/community/pager-view";
import { BottomTabBar, QrFab } from "../../components/ui/BottomTabBar";
import { useTheme } from "../../hooks/useTheme";
import {
  useHideOnScroll,
  TabBarScrollContext,
} from "../../hooks/useHideOnScroll";
import { TabNavigationContext } from "../../hooks/TabNavigationContext";
import type { TabKey } from "../../hooks/TabNavigationContext";
import { setActiveTabIndex, registerGoToFirstTab } from "../../utils/currentTab";
import DashboardScreen from "./index";
import CursosTab from "./cursos";
import HorarioScreen from "./horario";
import PerfilScreen from "./perfil";

const SCREENS: { key: TabKey; component: React.ComponentType }[] = [
  { key: "index",   component: DashboardScreen },
  { key: "cursos",  component: CursosTab },
  { key: "horario", component: HorarioScreen },
  { key: "perfil",  component: PerfilScreen },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollHandler, barStyle, setBarHeight, resetBar } = useHideOnScroll();
  const contentBottomPadding = 120 + insets.bottom;

  const [activeTab, setActiveTab] = useState<TabKey>("index");
  const pagerRef = useRef<PagerViewRef>(null);
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const scrollProgress = useSharedValue<number | null>(null);

  const screens = useMemo(
    () => SCREENS.map(({ key, component: Component }) => (
      <View key={key} style={{ flex: 1 }}>
        <Component />
      </View>
    )),
    [],
  );

  const onPageScroll = useCallback(
    (e: PagerViewOnPageScrollEvent) => {
      "worklet";
      scrollProgress.value = e.nativeEvent.position + e.nativeEvent.offset;
    },
    [],
  );

  const onPageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      scrollProgress.value = null;
      const index = e.nativeEvent.position;
      const tab = SCREENS[index]?.key;
      if (tab && tab !== activeTabRef.current) {
        activeTabRef.current = tab;
      setActiveTab(tab);
      setActiveTabIndex(index);
      resetBar();
      }
    },
    [resetBar],
  );

  const onTabChange = useCallback(
    (tab: TabKey) => {
      const index = SCREENS.findIndex((s) => s.key === tab);
      if (index >= 0) {
        pagerRef.current?.setPage(index);
        if (tab !== activeTabRef.current) {
          activeTabRef.current = tab;
          setActiveTab(tab);
          resetBar();
        }
      }
    },
    [resetBar],
  );

  useEffect(() => {
    registerGoToFirstTab(() => pagerRef.current?.setPage(0));
    return () => registerGoToFirstTab(null);
  }, []);

  const scrollContextValue = useMemo(
    () => ({ scrollHandler, contentBottomPadding }),
    [scrollHandler, contentBottomPadding],
  );

  return (
    <TabNavigationContext.Provider value={onTabChange}>
    <TabBarScrollContext.Provider value={scrollContextValue}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageScroll={onPageScroll}
          onPageSelected={onPageSelected}
        >
          {screens}
        </PagerView>

        <Animated.View
          style={[
            { position: "absolute", left: 0, right: 0, bottom: 0 },
            barStyle,
            { zIndex: 100 },
          ]}
          pointerEvents="box-none"
        >
          <QrFab onPress={() => router.push("/scanner")} />
          <BottomTabBar
            active={activeTab}
            scrollProgressSV={scrollProgress}
            onHeightChange={setBarHeight}
            onChange={onTabChange}
          />
        </Animated.View>
      </View>
    </TabBarScrollContext.Provider>
    </TabNavigationContext.Provider>
  );
}
