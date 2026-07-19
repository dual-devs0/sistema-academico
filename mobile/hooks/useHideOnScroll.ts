import { createContext, useContext } from "react";
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "../constants/design";

export function useHideOnScroll() {
  const insets = useSafeAreaInsets();
  const barHeight = useSharedValue(100);

  const translateY = useSharedValue(0);
  const lastY = useSharedValue(0);
  const visible = useSharedValue(1);

  const setBarHeight = (h: number) => {
    barHeight.value = h;
  };

  const resetBar = () => {
    translateY.value = withTiming(0, { duration: 200 });
    visible.value = 1;
    lastY.value = 0;
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const diff = y - lastY.value;
      const hiddenDistance = barHeight.value + insets.bottom + spacing.lg;

      if (y <= 0) {
        translateY.value = withTiming(0, { duration: 200 });
        visible.value = 1;
      } else if (diff > 4 && visible.value === 1 && y > 60) {
        translateY.value = withTiming(hiddenDistance, { duration: 220 });
        visible.value = 0;
      } else if (diff < -4 && visible.value === 0) {
        translateY.value = withTiming(0, { duration: 220 });
        visible.value = 1;
      }
      lastY.value = y;
    },
  });

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { scrollHandler, barStyle, setBarHeight, resetBar };
}

export const TAB_BAR_HEIGHT = 100;

interface TabBarScrollValue {
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  contentBottomPadding: number;
}

export const TabBarScrollContext = createContext<TabBarScrollValue | null>(null);

export function useTabBarScroll(): TabBarScrollValue {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) throw new Error("useTabBarScroll must be used within TabBarScrollProvider");
  return ctx;
}
