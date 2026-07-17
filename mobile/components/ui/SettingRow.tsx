import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { Pressable, Switch, Text, View } from "react-native";
import { fontFamily, fontSize, radius, spacing } from "../../constants/design";

/**
 * SettingRow — fila glass reusable para pantallas de ajustes.
 *
 * Variantes:
 * - `toggle`: renderiza un `Switch` a la derecha.
 * - `chevron`: renderiza `›` a la derecha; requiere `onPress`.
 * - `plain`: solo label + right slot custom.
 */

type Variant = "toggle" | "chevron" | "plain";

interface Props {
  glyph?: string;
  label: string;
  hint?: string;
  variant?: Variant;
  toggled?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}

export function SettingRow({
  glyph,
  label,
  hint,
  variant = "plain",
  toggled,
  onToggle,
  onPress,
  right,
  disabled,
}: Props) {
  const { colors } = useTheme();
const inner = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {glyph ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(0,180,216,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.cyan, fontSize: fontSize.body }}>{glyph}</Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.body,
          }}
        >
          {label}
        </Text>
        {hint ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {hint}
          </Text>
        ) : null}
      </View>

      {variant === "toggle" ? (
        <Switch
          value={toggled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: colors.cyan, false: "rgba(255,255,255,0.15)" }}
          thumbColor="#0a0e17"
          ios_backgroundColor="rgba(255,255,255,0.15)"
        />
      ) : variant === "chevron" ? (
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.headline }}>›</Text>
      ) : (
        right
      )}
    </View>
  );

  if (variant === "chevron" && onPress) {
  const { colors } = useTheme();
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}
