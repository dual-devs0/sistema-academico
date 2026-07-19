import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { GlassCard } from "./GlassCard";
import { fontFamily, fontSize, spacing } from "../../constants/design";

/**
 * StatCard — card KPI para grids 2x2 del dashboard y perfil.
 *
 * Layout:
 *   ┌──────────────────────┐
 *   │ LABEL (caption)      │
 *   │                      │
 *   │ 8.4         ↗ +0.3   │  ← value (mono cyan) + trend chip
 *   │                      │
 *   │ este semestre        │  ← optional footer
 *   └──────────────────────┘
 *
 * `value` se renderiza en JetBrains Mono cian por defecto (KPIs numéricos).
 * `valueColor` override para KPIs de estado (ej. "● ACTIVA" verde).
 */

type Trend = { value: string; direction: "up" | "down" | "flat" };

interface Props {
  label: string;
  value: string;
  valueColor?: string;
  footer?: string;
  trend?: Trend;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const TREND_COLOR: Record<Trend["direction"], string> = {
  up: colors.success,
  down: colors.error,
  flat: colors.textSecondary,
};

const TREND_GLYPH: Record<Trend["direction"], string> = {
  up: "↗",
  down: "↘",
  flat: "→",
};

export function StatCard({
  label,
  value,
  valueColor,
  footer,
  trend,
  onPress,
  style,
}: Props) {
  const { colors } = useTheme();
return (
    <GlassCard
      onPress={onPress}
      contentStyle={{ padding: spacing.lg }}
      style={style}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interMedium,
          fontSize: fontSize.caption,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: spacing.md,
        }}
      >
        <Text
          style={{
            color: valueColor ?? colors.textAccent,
            fontFamily: fontFamily.monoBold,
            fontSize: fontSize.numeric,
            lineHeight: fontSize.numeric + 2,
            textShadowColor: valueColor ?? colors.cyan,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>

        {trend ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text
              style={{
                color: TREND_COLOR[trend.direction],
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
              }}
            >
              {TREND_GLYPH[trend.direction]}
            </Text>
            <Text
              style={{
                color: TREND_COLOR[trend.direction],
                fontFamily: fontFamily.monoMedium,
                fontSize: fontSize.caption,
              }}
            >
              {trend.value}
            </Text>
          </View>
        ) : null}
      </View>

      {footer ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.caption,
            marginTop: spacing.xs,
          }}
          numberOfLines={1}
        >
          {footer}
        </Text>
      ) : null}
    </GlassCard>
  );
}
