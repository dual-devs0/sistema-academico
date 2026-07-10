import { Stack } from "expo-router";
import { colors } from "../../constants/design";

export default function AuthLayout() {
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
