import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";

type Notification = {
  id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
};

// ─── SVG Iconos para notificaciones ───────────────────────────────────────────

function IconPencil({ color = "#fbbf24", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconChartLine({ color = "#3b82f6", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="1" y1="22" x2="23" y2="22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconCheckCircle({ color = "#22c55e", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconAlert({ color = "#f43f5e", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L1 21h22L12 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

function IconBell({ color = "#06b6d4", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.7 20a2 2 0 01-3.4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconCalendarStar({ color = "#8b5cf6", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function BellIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={colors.textPrimary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke={colors.textPrimary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4 4L19 7"
        stroke={colors.cyan}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotificationsSheet({
  visible,
  notifications,
  onClose,
  onMarkAllRead,
}: {
  visible: boolean;
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  const unread = notifications.filter((n) => !n.leida).length;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{ position: "absolute", inset: 0 }}
          onPress={onClose}
        />

        <Animated.View
          entering={FadeInDown.duration(280).springify().damping(20).stiffness(180)}
          style={{
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: Platform.OS === "ios" ? 0 : 1,
            borderColor: colors.border,
            maxHeight: "80%",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowRadius: 24,
                shadowOpacity: 0.3,
              },
            }),
          }}
        >
          <View style={{ alignItems: "center", paddingTop: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.border,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: colors.glassBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BellIcon />
              </View>
              <View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interBold,
                    fontSize: 20,
                  }}
                >
                  Notificaciones
                </Text>
                {unread > 0 && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: 12,
                      marginTop: 1,
                    }}
                  >
                    {unread} sin leer
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              {unread > 0 && (
                <Pressable
                  onPress={onMarkAllRead}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    backgroundColor: colors.cyan + "18",
                    borderWidth: 1,
                    borderColor: colors.cyan + "30",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <CheckIcon />
                  <Text
                    style={{
                      color: colors.cyan,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: 12,
                    }}
                  >
                    Leídas
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.glassBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <ScrollView
            contentContainerStyle={{
              paddingVertical: spacing.sm,
              paddingBottom: Platform.OS === "ios" ? 40 : spacing["3xl"],
              paddingHorizontal: spacing.md,
              gap: spacing.sm,
            }}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center", gap: spacing.sm }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: colors.glassBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BellIcon />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: spacing.xs,
                  }}
                >
                  Sin notificaciones
                </Text>
              </View>
            ) : (
              notifications.map((n, i) => {
                const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.aviso;
                return (
                  <Animated.View
                    key={n.id}
                    entering={FadeInDown.delay(i * 40).duration(200)}
                  >
                    <View
                      style={{
                        backgroundColor: n.leida
                          ? "transparent"
                          : colors.glassBg,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: n.leida
                          ? "transparent"
                          : cfg.color + "20",
                        overflow: "hidden",
                      }}
                    >
                      <Pressable
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "flex-start",
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.md,
                          gap: spacing.sm,
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <View style={{ paddingTop: 2, position: "relative" }}>
                          {!n.leida && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: cfg.color,
                                position: "absolute",
                                top: -2,
                                left: -10,
                                zIndex: 1,
                              }}
                            />
                          )}
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
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

                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text
                              style={{
                                color: cfg.color,
                                fontFamily: fontFamily.interSemibold,
                                fontSize: 10,
                                letterSpacing: 1,
                                textTransform: "uppercase",
                              }}
                            >
                              {cfg.label}
                            </Text>
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontFamily: fontFamily.inter,
                                fontSize: 10,
                              }}
                            >
                              {formatRelativa(n.fecha)}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: n.leida ? colors.textSecondary : colors.textPrimary,
                              fontFamily: n.leida ? fontFamily.inter : fontFamily.interMedium,
                              fontSize: 13,
                              lineHeight: 18,
                            }}
                          >
                            {n.mensaje}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
