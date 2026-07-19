import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, LayoutChangeEvent, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import { CursosIconOutline } from "../icons/CursosIcon";
import { fontFamily, spacing, radius } from "../../constants/design";

type TabKey = "index" | "cursos" | "horario" | "perfil";

const TABS: { key: TabKey; label: string }[] = [
  { key: "index", label: "Inicio" },
  { key: "cursos", label: "Cursos" },
  { key: "horario", label: "Horario" },
  { key: "perfil", label: "Perfil" },
];

const TAB_COUNT = TABS.length;
const SPACING_XS = 4;

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21v-6h6v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HorarioIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth={1.8} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="14" r="1" fill={color} />
      <Circle cx="16" cy="14" r="1" fill={color} />
      <Circle cx="8" cy="14" r="1" fill={color} />
    </Svg>
  );
}

function PerfilIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={1.8} />
      <Path d="M4.5 20.5c1.5-4 4.5-6 7.5-6s6 2 7.5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const ICONS: Record<TabKey, (c: string) => React.JSX.Element> = {
  index: (c) => <HomeIcon color={c} />,
  cursos: (c) => <CursosIconOutline color={c} />,
  horario: (c) => <HorarioIcon color={c} />,
  perfil: (c) => <PerfilIcon color={c} />,
};

export function QrFab({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const SIZE = 48;

  return (
    <View
      style={{
        position: "absolute",
        top: -SIZE / 2 + 4,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          shadowColor: colors.cyan,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
          overflow: "hidden",
        }}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            width: SIZE,
            height: SIZE,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <LinearGradient
            colors={["#06b6d4", "#0891b2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: SIZE / 2,
            }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="#ffffff">
              <Path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5z" />
              <Path d="M14 3h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5z" />
              <Path d="M3 14h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3z" />
              <Path d="M14 14h2v2h-2v-2zm2 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 2h2v2h-2v-2zm2 0h2v2h-2v-2zm2-4h2v2h-2v-2z" />
            </Svg>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const SPRING_CONFIG = { damping: 22, stiffness: 220, overshootClamping: true };

function TabItem({
  tab,
  idx,
  nearestIdxSV,
  isDark,
  colors,
  onLayout,
  onPress,
}: {
  tab: { key: TabKey; label: string };
  idx: number;
  nearestIdxSV: SharedValue<number>;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  onLayout: (key: TabKey) => (e: LayoutChangeEvent) => void;
  onPress: (key: TabKey) => void;
}) {
  const inactiveOverlayStyle = useAnimatedStyle(() => ({
    opacity: nearestIdxSV.value === idx ? 0 : 1,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: nearestIdxSV.value === idx ? 1 : 0,
  }));

  const iconActiveColor = isDark ? "#0b0f14" : colors.textPrimary;
  const iconInactiveColor = isDark ? "#ffffff" : colors.textSecondary;

  return (
    <Pressable
      onLayout={onLayout(tab.key)}
      onPress={() => onPress(tab.key)}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingVertical: 8,
        paddingHorizontal: 6,
        zIndex: 1,
      }}
    >
      <View style={{ position: "relative" }}>
        {ICONS[tab.key](iconActiveColor)}
        <Animated.View style={[StyleSheet.absoluteFill, inactiveOverlayStyle]}>
          {ICONS[tab.key](iconInactiveColor)}
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          {
            color: isDark ? "#0b0f14" : colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: 11,
          },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

export function BottomTabBar({
  active,
  scrollProgressSV,
  onChange,
  onHeightChange,
}: {
  active: TabKey;
  scrollProgressSV: SharedValue<number | null>;
  onChange: (t: TabKey) => void;
  onHeightChange?: (h: number) => void;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";

  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const barWidth = useSharedValue(0);

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const hasInitialLayout = useSharedValue(0);

  const activeLayout = tabLayouts[active];

  const nearestIdxSV = useSharedValue(
    TABS.findIndex((t) => t.key === active),
  );

  useEffect(() => {
    nearestIdxSV.value = TABS.findIndex((t) => t.key === active);
  }, [active]);

  useAnimatedReaction(
    () => scrollProgressSV.value,
    (progress, previous) => {
      if (progress === null) return;
      const prevRounded = previous !== null ? Math.round(previous) : -1;
      const currRounded = Math.round(progress);
      if (currRounded !== prevRounded) {
        nearestIdxSV.value = currRounded;
      }
    },
    [],
  );

  const lastPillTarget = useRef<TabKey | null>(null);
  useEffect(() => {
    if (!activeLayout) return;
    if (active === lastPillTarget.current && hasInitialLayout.value === 1) return;
    lastPillTarget.current = active;
    pillX.value = withSpring(activeLayout.x, SPRING_CONFIG);
    pillWidth.value = withSpring(activeLayout.width, SPRING_CONFIG);
    if (hasInitialLayout.value === 0) hasInitialLayout.value = 1;
  }, [active, activeLayout?.x, activeLayout?.width]);

  const showPill = useDerivedValue(() => pillWidth.value > 0 && hasInitialLayout.value === 1);

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const progress = scrollProgressSV.value;

    if (progress !== null && barWidth.value > 0) {
      const contentW = barWidth.value - 2 * SPACING_XS;
      const tabW = contentW / TAB_COUNT;
      const rawPos = Math.max(0, Math.min(progress, TAB_COUNT - 1));
      const leftIdx = Math.min(Math.floor(rawPos), TAB_COUNT - 2);
      const frac = rawPos - leftIdx;
      const x = SPACING_XS + (leftIdx + frac) * tabW;

      pillX.value = x;
      pillWidth.value = tabW;
      if (hasInitialLayout.value === 0) hasInitialLayout.value = 1;

      return { transform: [{ translateX: x }], width: tabW, opacity: 1 };
    }

    return {
      transform: [{ translateX: pillX.value }],
      width: pillWidth.value,
      opacity: showPill.value ? 1 : 0,
    };
  });

  const onTabLayout = (key: TabKey) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => {
      if (prev[key]?.x === x && prev[key]?.width === width) return prev;
      return { ...prev, [key]: { x, width } };
    });
  };

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    barWidth.value = e.nativeEvent.layout.width;
  }, []);

  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
      }}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View
        onLayout={onBarLayout}
        style={{
          flexDirection: "row",
          backgroundColor: isDark ? "#181d24" : colors.surface,
          borderRadius: radius.xl ?? 30,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
          paddingTop: 28,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.xs,
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 22,
              bottom: spacing.sm,
              left: 0,
              backgroundColor: isDark ? "#ffffff" : "#e2e8f0",
              borderRadius: radius.xl ?? 24,
            },
            pillAnimatedStyle,
          ]}
        />

        {TABS.map((t, idx) => (
          <TabItem
            key={t.key}
            tab={t}
            idx={idx}
            nearestIdxSV={nearestIdxSV}
            isDark={isDark}
            colors={colors}
            onLayout={onTabLayout}
            onPress={onChange}
          />
        ))}
      </View>
    </View>
  );
}
