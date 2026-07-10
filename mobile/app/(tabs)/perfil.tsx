import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";
import { useAuth } from "../../hooks/useAuth";

/** Stub — pantalla Perfil se completa en el siguiente paso. Ya incluye logout wired. */
export default function PerfilScreen() {
  const { logout } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: "space-between" }}>
        <View>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interBold,
              fontSize: fontSize.headlineLg,
            }}
          >
            Perfil
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              marginTop: spacing.sm,
            }}
          >
            Pendiente de implementación completa.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            void logout();
          }}
          style={({ pressed }) => ({
            backgroundColor: colors.logoutBg,
            borderWidth: 1,
            borderColor: colors.logoutBorder,
            borderRadius: radius.md,
            paddingVertical: spacing.lg,
            alignItems: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: "#fca5a5",
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
            }}
          >
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
