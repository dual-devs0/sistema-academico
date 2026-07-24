import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useSharedValue } from "react-native-reanimated";
import { BottomTabBar, QrFab } from "../../components/ui/BottomTabBar";
import { useTheme } from "../../hooks/useTheme";
import {
  useHideOnScroll,
  TabBarScrollContext,
} from "../../hooks/useHideOnScroll";
import { TabNavigationContext } from "../../hooks/TabNavigationContext";
import type { TabKey } from "../../hooks/TabNavigationContext";
import { registerGoToFirstTab } from "../../utils/currentTab";
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
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const scrollProgress = useSharedValue<number | null>(null);

  const screenIndex = SCREENS.findIndex(s => s.key === activeTab);

  const onTabChange = useCallback(
    (tab: TabKey) => {
      const index = SCREENS.findIndex((s) => s.key === tab);
      if (index >= 0 && tab !== activeTabRef.current) {
        activeTabRef.current = tab;
        setActiveTab(tab);
        resetBar();
      }
    },
    [resetBar],
  );

  useEffect(() => {
    registerGoToFirstTab(() => setActiveTab("index"));
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
        <View style={{ flex: 1 }}>
          {SCREENS.map(({ key, component: Component }, i) => (
            <View key={key} style={{ flex: 1, display: i === screenIndex ? 'flex' : 'none' }}>
              <Component />
            </View>
          ))}
        </View>

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
