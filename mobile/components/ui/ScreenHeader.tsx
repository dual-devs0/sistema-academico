import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { UserAvatar } from "./UserAvatar";
import { NotificationsBell } from "./NotificationsBell";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";

/**
 * ScreenHeader — cabecera compartida por Dashboard, Cursos, Scanner,
 * Horario, Perfil, Cuenta, Exámenes.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ (avatar cian) ESTUDIANTE            🔔  │
 *   │               Juan Pérez                 │
 *   └──────────────────────────────────────────┘
 *
 * - `name` alimenta tanto el saludo como las iniciales del avatar
 *   (vía `UserAvatar`, componente único reusado en toda la app).
 * - `fotoUrl` opcional — si el backend algún día expone foto de perfil.
 * - Tocar el avatar navega a `/perfil` salvo que `showBack` esté activo
 *   (ahí el slot izquierdo es la flecha atrás, no el avatar).
 * - `onBellPress` opcional — si no se pasa, la campana usa
 *   `NotificationsBell` (badge + modal) por defecto.
 * - `showBack` reemplaza el bloque avatar+greeting por una flecha atrás
 *   + título (para Cursos detalle, Cuenta, Exámenes).
 */

interface Props {
  greeting?: string;
  name?: string;
  fotoUrl?: string;
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
  greeting = "ESTUDIANTE",
  name,
  fotoUrl,
  avatarInitials,
  title,
  showBack,
  onBackPress,
  onBellPress,
  hideBell,
  right,
  style,
}: Props) {
  const router = useRouter();

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
          <UserAvatar
            nombre={name ?? avatarInitials}
            fotoUrl={fotoUrl}
            size={36}
            borderWidth={1.5}
            onPress={() => router.push("/(tabs)/perfil")}
          />
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

      {right ?? (hideBell ? null : onBellPress ? (
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
          <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>🔔</Text>
        </Pressable>
      ) : (
        <NotificationsBell />
      ))}
    </View>
  );
}
