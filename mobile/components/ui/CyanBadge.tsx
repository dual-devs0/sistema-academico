import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";

/**
 * CyanBadge — pill/chip para estados y etiquetas.
 *
 * Variantes:
 * - `filled`: fondo cian, texto oscuro (chip semestre activo).
 * - `outline`: fondo transparente, borde cian, texto cian (HABILITADO).
 * - `dim`: fondo cyan-dim, texto cian (fecha del próximo evento).
 * - `success` / `warning` / `error`: mismos slots con colores semánticos.
 */

type Variant = "filled" | "outline" | "dim" | "success" | "warning" | "error";

interface Props {
  label: string;
  variant?: Variant;
  size?: "sm" | "md";
  glyph?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLE: Record<
  Variant,
  { bg: string; border: string; fg: string }
> = {
  filled: { bg: colors.cyan, border: colors.cyan, fg: "#0a0e17" },
  outline: { bg: "transparent", border: colors.cyan, fg: colors.cyan },
  dim: { bg: colors.cyanDim, border: "transparent", fg: colors.cyan },
  success: {
    bg: "rgba(34,197,94,0.15)",
    border: "transparent",
    fg: colors.success,
  },
  warning: {
    bg: "rgba(245,158,11,0.15)",
    border: "transparent",
    fg: colors.warning,
  },
  error: {
    bg: "rgba(239,68,68,0.15)",
    border: "transparent",
    fg: colors.error,
  },
};

export function CyanBadge({
  label,
  variant = "filled",
  size = "md",
  glyph,
  style,
}: Props) {
  const v = VARIANT_STYLE[variant];
  const paddingV = size === "sm" ? 4 : 6;
  const paddingH = size === "sm" ? spacing.sm : spacing.md;
  const fs = size === "sm" ? fontSize.caption : fontSize.label;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: spacing.xs,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === "transparent" ? 0 : 1,
          borderRadius: radius.pill,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      {glyph ? (
        <Text
          style={{
            color: v.fg,
            fontSize: fs,
            lineHeight: fs + 2,
          }}
        >
          {glyph}
        </Text>
      ) : null}
      <Text
        style={{
          color: v.fg,
          fontFamily: fontFamily.interSemibold,
          fontSize: fs,
          letterSpacing: 1,
          textTransform: "uppercase",
          lineHeight: fs + 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
