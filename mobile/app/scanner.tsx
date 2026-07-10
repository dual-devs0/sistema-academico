import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, fontSize, radius, spacing } from "../constants/design";

/** Stub — QR Scanner real (expo-camera + overlay + animación) va en el siguiente paso. */
export default function ScannerScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View
          style={{
            flex: 1,
            padding: spacing.xl,
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interBold,
              fontSize: fontSize.headlineLg,
              textAlign: "center",
            }}
          >
            QR Scanner
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              textAlign: "center",
            }}
          >
            Pendiente: cámara + overlay de esquinas + línea de scan.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingVertical: spacing.lg,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.body,
              }}
            >
              Cerrar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
