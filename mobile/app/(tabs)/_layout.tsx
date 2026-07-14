import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, fontSize, spacing, tabBar } from "../../constants/design";

type TabBarProps = React.ComponentProps<typeof Tabs>["tabBar"] extends
  | ((props: infer P) => React.ReactNode)
  | undefined
  ? P
  : never;

/**
 * Tab bar custom con botón QR central elevado.
 * - 4 tabs reales de expo-router: index, notas, horario, perfil.
 * - Un 5.º "botón" central que no es tab: abre /scanner como modal.
 * - El QR button sube tabBar.qrButtonLift px sobre el tab bar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <UcaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="cursos" options={{ title: "Cursos" }} />
      <Tabs.Screen name="horario" options={{ title: "Horario" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

type TabDef = {
  routeName: "index" | "cursos" | "horario" | "perfil";
  label: string;
  glyph: string;
};

const LEFT_TABS: TabDef[] = [
  { routeName: "index", label: "Inicio", glyph: "◉" },
  { routeName: "cursos", label: "Cursos", glyph: "🎓" },
];

const RIGHT_TABS: TabDef[] = [
  { routeName: "horario", label: "Horario", glyph: "▦" },
  { routeName: "perfil", label: "Perfil", glyph: "◍" },
];

const TAB_INACTIVE = "#6b7280";

function UcaTabBar({ state, navigation }: TabBarProps) {
  const router = useRouter();
  const currentRouteName = state.routes[state.index]?.name;

  function goto(routeName: string, isFocused: boolean) {
    const event = navigation.emit({
      type: "tabPress",
      target: routeName,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: tabBar.height,
          paddingHorizontal: spacing.sm,
        }}
      >
        {LEFT_TABS.map((t) => (
          <TabItem
            key={t.routeName}
            def={t}
            focused={currentRouteName === t.routeName}
            onPress={() => goto(t.routeName, currentRouteName === t.routeName)}
          />
        ))}

        <QrCenterButton onPress={() => router.push("/scanner")} />

        {RIGHT_TABS.map((t) => (
          <TabItem
            key={t.routeName}
            def={t}
            focused={currentRouteName === t.routeName}
            onPress={() => goto(t.routeName, currentRouteName === t.routeName)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function TabItem({
  def,
  focused,
  onPress,
}: {
  def: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.sm,
        gap: 2,
      }}
    >
      <Text
        style={{
          color: focused ? colors.cyan : TAB_INACTIVE,
          fontSize: fontSize.headline,
        }}
      >
        {def.glyph}
      </Text>
      <Text
        style={{
          color: focused ? colors.cyan : TAB_INACTIVE,
          fontFamily: focused ? fontFamily.monoMedium : fontFamily.mono,
          fontSize: 10,
        }}
      >
        {def.label}
      </Text>
    </Pressable>
  );
}

function QrCenterButton({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: tabBar.qrButtonSize,
          height: tabBar.qrButtonSize,
          borderRadius: tabBar.qrButtonSize / 2,
          backgroundColor: colors.cyan,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: tabBar.qrButtonLift,
          shadowColor: colors.cyan,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: pressed ? 0.3 : 0.4,
          shadowRadius: 12,
          elevation: 10,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Text
          style={{
            color: "#0a0e17",
            fontFamily: fontFamily.interBold,
            fontSize: fontSize.headlineLg,
          }}
        >
          ▣
        </Text>
      </Pressable>
    </View>
  );
}
