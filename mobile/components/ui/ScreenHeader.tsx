import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";

/**
 * ScreenHeader — cabecera compartida por Dashboard, Notas, Perfil, Cuenta,
 * Exámenes.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ (avatar cian) BIENVENIDO/ESTUDIANTE  🔔  │
 *   │               Juan Pérez                 │
 *   └──────────────────────────────────────────┘
 *
 * - `avatarInitials` renderiza fallback si no hay `avatarUrl` (todavía no
 *   tenemos endpoint de foto, por eso solo iniciales).
 * - `onBellPress` opcional — algunas pantallas ocultan la campana.
 * - `showBack` reemplaza el bloque avatar+greeting por una flecha atrás
 *   + título (para Cursos, Cuenta, Exámenes).
 */

interface Props {
  greeting?: string;
  name?: string;
  avatarInitials?: string;
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onBellPress?: () => void;
  hideBell?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  greeting = "BIENVENIDO / ESTUDIANTE",
  name,
  avatarInitials,
  title,
  showBack,
  onBackPress,
  onBellPress,
  hideBell,
  right,
  style,
}: Props) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          gap: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
        {showBack ? (
          <Pressable
            onPress={onBackPress}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: fontSize.headline,
              }}
            >
              ‹
            </Text>
          </Pressable>
        ) : (
          <Avatar initials={avatarInitials} />
        )}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interBold,
                fontSize: fontSize.headlineLg,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : (
            <>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interMedium,
                  fontSize: fontSize.caption,
                  letterSpacing: 1.5,
                }}
                numberOfLines={1}
              >
                {greeting}
              </Text>
              {name ? (
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.body,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>

      {right ??
        (hideBell ? null : (
          <Pressable
            onPress={onBellPress}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>
              🔔
            </Text>
          </Pressable>
        ))}
    </View>
  );
}

function Avatar({ initials }: { initials?: string }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderLeftWidth: 3,
        borderColor: colors.border,
        borderLeftColor: colors.cyan,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.cyan,
          fontFamily: fontFamily.interBold,
          fontSize: fontSize.body,
        }}
      >
        {initials?.slice(0, 2).toUpperCase() ?? "··"}
      </Text>
    </View>
  );
}
