import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue, useAnimatedScrollHandler } from "react-native-reanimated";
import { BottomTabBar, QrFab } from "../../components/ui/BottomTabBar";
import { useTheme } from "../../hooks/useTheme";
import {
  useHideOnScroll,
  TabBarScrollContext,
} from "../../hooks/useHideOnScroll";
import { TabNavigationContext } from "../../hooks/TabNavigationContext";
import type { TabKey } from "../../hooks/TabNavigationContext";
import { registerGoToFirstTab, setActiveTabIndex } from "../../utils/currentTab";
import { fetchPerfil } from "../../services/dashboardService";
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
  const { width: screenWidth } = useWindowDimensions();

  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    fetchPerfil().then((u) => setRole(u.role)).catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>("index");
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const scrollX = useSharedValue(0);
  const scrollProgress = useSharedValue<number | null>(null);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      scrollProgress.value = event.contentOffset.x / screenWidth;
    },
  });

  const onMomentumEnd = useCallback(() => {
    const page = Math.round(scrollX.value / screenWidth);
    const tab = SCREENS[page]?.key;
    if (tab && tab !== activeTabRef.current) {
      activeTabRef.current = tab;
      setActiveTab(tab);
      setActiveTabIndex(page);
      resetBar();
    }
  }, [screenWidth, resetBar]);

  const onTabChange = useCallback(
    (tab: TabKey) => {
      const index = SCREENS.findIndex((s) => s.key === tab);
      if (index >= 0 && tab !== activeTabRef.current) {
        activeTabRef.current = tab;
        setActiveTab(tab);
        setActiveTabIndex(index);
        resetBar();
        scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
      }
    },
    [screenWidth, resetBar],
  );

  useEffect(() => {
    registerGoToFirstTab(() => {
      setActiveTab("index");
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    });
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
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumEnd}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {SCREENS.map(({ key, component: Component }) => (
            <View key={key} style={{ width: screenWidth, flex: 1 }}>
              <Component />
            </View>
          ))}
        </Animated.ScrollView>

        <Animated.View
          style={[
            { position: "absolute", left: 0, right: 0, bottom: insets.bottom },
            barStyle,
            { zIndex: 100 },
          ]}
          pointerEvents="box-none"
        >
          {role === "alumno" && <QrFab onPress={() => router.push("/scanner")} />}
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
