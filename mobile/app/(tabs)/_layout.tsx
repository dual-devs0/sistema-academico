import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { tabBar } from "../../constants/design";

type TabBarProps = React.ComponentProps<typeof Tabs>["tabBar"] extends
  | ((props: infer P) => React.ReactNode)
  | undefined
  ? P
  : never;

export default function TabsLayout() {
  const { colors } = useTheme();
return (
    <Tabs
      tabBar={(props) => <UcaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: "Inicio" }} />
      <Tabs.Screen name="cursos"  options={{ title: "Cursos" }} />
      <Tabs.Screen name="horario" options={{ title: "Horario" }} />
      <Tabs.Screen name="perfil"  options={{ title: "Perfil" }} />
    </Tabs>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconHome({ color, size = 20 }: { color: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9 21 9 15 12 15C15 15 15 21 15 21M9 21H15"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconCursos({ color, size = 20 }: { color: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L2 8L12 13L22 8L12 3Z"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M6 10.6V16C6 16 8 18 12 18C16 18 18 16 18 16V10.6"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M22 8V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconHorario({ color, size = 20 }: { color: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M8 2V6M16 2V6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3 9H21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01"
        stroke={color} strokeWidth={2} strokeLinecap="round"
      />
    </Svg>
  );
}

function IconPerfil({ color, size = 20 }: { color: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
        stroke={color} strokeWidth={1.8} strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = {
  routeName: "index" | "cursos" | "horario" | "perfil";
  Icon: (props: { color: string }) => React.ReactNode;
};

const ALL_TABS: TabDef[] = [
  { routeName: "index",  Icon: (p) => <IconHome   {...p} /> },
  { routeName: "cursos", Icon: (p) => <IconCursos {...p} /> },
  { routeName: "horario", Icon: (p) => <IconHorario {...p} /> },
  { routeName: "perfil",  Icon: (p) => <IconPerfil  {...p} /> },
];

// ─── Bar ──────────────────────────────────────────────────────────────────────

function UcaTabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name;

  function goto(routeName: string, isFocused: boolean) {
  const { colors } = useTheme();

    const event = navigation.emit({
      type: "tabPress",
      target: routeName,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
  const { colors } = useTheme();
      navigation.navigate(routeName);
    }
  }

  // Dividir tabs en dos mitades + slot central para el FAB
  const leftTabs = ALL_TABS.slice(0, 2);
  const rightTabs = ALL_TABS.slice(2);

  return (
    <View style={{ position: "relative" }}>
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "transparent" }}>
        <View
          style={{
            backgroundColor: tabBar.barBg,
            borderTopWidth: 0.5,
            borderTopColor: "rgba(255,255,255,0.08)",
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: tabBar.height,
              paddingHorizontal: 4,
            }}
          >
            {/* Tabs izquierdos: Inicio, Cursos */}
            {leftTabs.map((t) => (
              <TabItem
                key={t.routeName}
                def={t}
                focused={currentRouteName === t.routeName}
                onPress={() => goto(t.routeName, currentRouteName === t.routeName)}
              />
            ))}

            {/* Slot central para el FAB QR — flex:1 mantiene distribución equitativa */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 1 }} />
            </View>

            {/* Tabs derechos: Horario, Perfil */}
            {rightTabs.map((t) => (
              <TabItem
                key={t.routeName}
                def={t}
                focused={currentRouteName === t.routeName}
                onPress={() => goto(t.routeName, currentRouteName === t.routeName)}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* FAB QR — flotante, centrado, sobresale */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          alignItems: "center",
          pointerEvents: "box-none",
        }}
      >
        <QrCenterButton onPress={() => router.push("/scanner")} />
      </View>
    </View>
  );
}

// ─── Tab item — icono sin pill ────────────────────────────────────────────────

function TabItem({
  def,
  focused,
  onPress,
}: {
  def: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const iconColor = focused ? tabBar.active : tabBar.inactive;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        flex: 1,
        height: tabBar.height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <def.Icon color={iconColor} />
    </Pressable>
  );
}

// ─── QR — círculo de 56px, sobresale 20px ────────────────────────────────────

function QrCenterButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const SIZE = tabBar.qrButtonSize;

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        shadowColor: tabBar.active,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 16,
        elevation: 12,
        overflow: "hidden",
        transform: [{ translateY: -20 }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: SIZE,
          height: SIZE,
          transform: [{ scale: pressed ? 0.9 : 1 }],
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
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="#ffffff">
            <Path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5z" />
            <Path d="M14 3h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5z" />
            <Path d="M3 14h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3z" />
            <Path d="M14 14h2v2h-2v-2zm2 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 2h2v2h-2v-2zm2 0h2v2h-2v-2zm2-4h2v2h-2v-2z" />
          </Svg>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
