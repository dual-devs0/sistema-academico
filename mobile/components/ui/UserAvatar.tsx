import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontFamily } from "../../constants/design";

/**
 * UserAvatar — avatar reusable para todos los headers + Perfil.
 *
 * - Con `fotoUrl`: `Image` circular con `uri`.
 * - Sin foto: iniciales (primera letra nombre + primera letra apellido)
 *   sobre `LinearGradient` diagonal cian.
 * - `size` default 36 (header). Perfil usa 80.
 * - `borderWidth` default 1.5 (header). Perfil usa 2.
 */

interface UserAvatarProps {
  nombre?: string;
  fotoUrl?: string;
  size?: number;
  borderWidth?: number;
  onPress?: () => void;
}

function getInitials(nombre?: string): string {
  if (!nombre) return "··";
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  nombre,
  fotoUrl,
  size = 36,
  borderWidth = 1.5,
  onPress,
}: UserAvatarProps) {
  const content = fotoUrl ? (
    <Image
      source={{ uri: fotoUrl }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: colors.cyan,
      }}
    />
  ) : (
    <LinearGradient
      colors={["rgba(0,180,216,0.35)", colors.cyan]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: colors.cyan,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.background,
          fontFamily: fontFamily.interBold,
          fontSize: Math.max(11, size * 0.34),
        }}
      >
        {getInitials(nombre)}
      </Text>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return <View>{content}</View>;
}
