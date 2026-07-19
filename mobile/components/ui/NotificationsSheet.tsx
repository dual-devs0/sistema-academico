import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";
import { fontFamily, fontSize, radius, spacing } from "../../constants/design";

const { width: SCREEN_W } = Dimensions.get("window");
const PANEL_W = Math.min(SCREEN_W - 24, 340);

type Notification = {
  id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
};

// ─── SVG Iconos para notificaciones ───────────────────────────────────────────

function IconPencil({ color = "#fbbf24" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconChartLine({ color = "#3b82f6" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="1" y1="22" x2="23" y2="22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconCheckCircle({ color = "#22c55e" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconAlert({ color = "#f43f5e" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L1 21h22L12 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

function IconBell({ color = "#06b6d4" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 20a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconCalendarStar({ color = "#8b5cf6" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.8} />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={1.8} />
      <Path d="M12 12l1.5 3 3.5.5-2.5 2.5.5 3.5L12 19l-3 1.5.5-3.5L7 15.5l3.5-.5L12 12z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  examen:     { icon: <IconPencil />, color: "#fbbf24", bg: "rgba(251,191,36,0.18)", label: "Examen" },
  nota:       { icon: <IconChartLine />, color: "#3b82f6", bg: "rgba(59,130,246,0.18)", label: "Calificación" },
  asistencia: { icon: <IconCheckCircle />, color: "#22c55e", bg: "rgba(34,197,94,0.18)", label: "Asistencia" },
  deuda:      { icon: <IconAlert />, color: "#f43f5e", bg: "rgba(244,63,94,0.18)", label: "Deuda" },
  aviso:      { icon: <IconBell />, color: "#06b6d4", bg: "rgba(6,182,212,0.18)", label: "General" },
  evento:     { icon: <IconCalendarStar />, color: "#8b5cf6", bg: "rgba(139,92,246,0.18)", label: "Evento" },
};

function formatRelativa(fecha: string): string {
  const d = new Date(fecha);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return `Hace ${diff} días`;
}

function CheckIcon() {
  const { colors } = useTheme();

  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={colors.cyan} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function NotificationsSheet({
  visible,
  notifications,
  onClose,
  onMarkAllRead,
  onNotificationPress,
}: {
  visible: boolean;
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNotificationPress?: (n: Notification) => void;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  const unread = notifications.filter((n) => !n.leida).length;

  const panelStyle = useMemo(() => ({
    width: PANEL_W,
    backgroundColor: isDark ? "#13161e" : colors.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    shadowOpacity: 0.4,
    elevation: 20,
    maxHeight: "70%" as const,
    overflow: "hidden" as const,
  }), [isDark, colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(150)}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={onClose}
        />

        <View style={{ flex: 1, paddingTop: spacing.xl + 52, paddingRight: spacing.sm, alignItems: "flex-end" }}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={panelStyle}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: 15,
                }}
              >
                Notificaciones
              </Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {unread > 0 && (
                  <Pressable
                    onPress={() => { onMarkAllRead(); onClose(); }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: radius.pill,
                      backgroundColor: colors.cyan + "18",
                      borderWidth: 1,
                      borderColor: colors.cyan + "30",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <CheckIcon />
                    <Text style={{ color: colors.cyan, fontFamily: fontFamily.interSemibold, fontSize: 10 }}>
                      Leídas
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: isDark ? "#1e2128" : colors.glassBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>✕</Text>
                </Pressable>
              </View>
            </View>

            {/* Lista */}
            <ScrollView
              contentContainerStyle={{ paddingBottom: spacing.xs }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {notifications.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center", gap: spacing.sm }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isDark ? "#1a1d26" : colors.glassBg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
                    </Svg>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.interMedium, fontSize: 13 }}>
                    Sin notificaciones
                  </Text>
                </View>
              ) : (
                notifications.map((n, i) => {
                  const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.aviso;
                  return (
                    <Animated.View
                      key={n.id}
                      entering={FadeIn.delay(i * 30).duration(180)}
                    >
                      <Pressable
                        onPress={() => onNotificationPress?.(n)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "flex-start",
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          gap: spacing.sm,
                          backgroundColor: pressed
                            ? isDark ? "rgba(255,255,255,0.04)" : colors.glassBg
                            : "transparent",
                          borderBottomWidth: i < notifications.length - 1 ? 1 : 0,
                          borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : colors.border + "60",
                        })}
                      >
                        <View style={{ paddingTop: 2, position: "relative" }}>
                          {!n.leida && (
                            <View
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: 3.5,
                                backgroundColor: cfg.color,
                                position: "absolute",
                                top: -1,
                                left: -8,
                                zIndex: 1,
                              }}
                            />
                          )}
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              backgroundColor: cfg.bg,
                              borderWidth: 1,
                              borderColor: cfg.color + "30",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {cfg.icon}
                          </View>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text
                              style={{
                                color: cfg.color,
                                fontFamily: fontFamily.interSemibold,
                                fontSize: 9,
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                              }}
                            >
                              {cfg.label}
                            </Text>
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontFamily: fontFamily.inter,
                                fontSize: 12,
                              }}
                            >
                              {formatRelativa(n.fecha)}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: n.leida ? colors.textSecondary : colors.textPrimary,
                              fontFamily: n.leida ? fontFamily.inter : fontFamily.interMedium,
                              fontSize: 12,
                              lineHeight: 16,
                            }}
                            numberOfLines={3}
                          >
                            {n.mensaje}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
