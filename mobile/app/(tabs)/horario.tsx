import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, fontSize, spacing } from "../../constants/design";

/** Stub — pantalla Horario/Calendario se implementa en el siguiente paso. */
export default function HorarioScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flex: 1, padding: spacing.xl }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interBold,
            fontSize: fontSize.headlineLg,
          }}
        >
          Horario
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.caption,
            marginTop: spacing.sm,
          }}
        >
          Pendiente de implementación.
        </Text>
      </View>
    </SafeAreaView>
  );
}
