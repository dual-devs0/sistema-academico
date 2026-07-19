import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { Stack } from "expo-router";


export default function AuthLayout() {
  const { colors } = useTheme();
return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
