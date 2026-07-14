import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fontFamily, fontSize, radius, spacing } from "../../constants/design";

/**
 * NotificationsBell — ícono de campana con badge de no leídas + modal
 * sheet con la lista.
 *
 * Persistencia: AsyncStorage `uca.notifications`. No hay endpoint backend
 * de notificaciones todavía — semilla local con 3 notificaciones de
 * ejemplo la primera vez que se abre la app; a partir de ahí el estado
 * leído/no-leído vive en el dispositivo.
 *
 * BACKEND TODO: reemplazar la semilla local por `GET /notificaciones/mias`
 * cuando exista endpoint de listado (hoy `notificaciones_router.py` solo
 * tiene subscribe/test de push, no un feed).
 */

type NotifTipo = "nota" | "evento" | "cuota" | "general";

interface NotifItem {
  id: string;
  tipo: NotifTipo;
  texto: string;
  fechaIso: string;
  leida: boolean;
}

const STORAGE_KEY = "uca.notifications";

const TIPO_GLYPH: Record<NotifTipo, string> = {
  nota: "🎓",
  evento: "📅",
  cuota: "👛",
  general: "ℹ",
};

const TIPO_COLOR: Record<NotifTipo, string> = {
  nota: colors.cyan,
  evento: colors.warning,
  cuota: "#f97316",
  general: colors.textSecondary,
};

function seedNotifications(): NotifItem[] {
  const now = Date.now();
  return [
    {
      id: "seed-1",
      tipo: "nota",
      texto: "Nota cargada: Parcial 1 — Análisis Mat. 8.5",
      fechaIso: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      leida: false,
    },
    {
      id: "seed-2",
      tipo: "evento",
      texto: "Próximo parcial en 3 días — Programación II",
      fechaIso: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      leida: false,
    },
    {
      id: "seed-3",
      tipo: "cuota",
      texto: "Cuota pendiente — vence en 5 días",
      fechaIso: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      leida: false,
    },
  ];
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setItems(JSON.parse(raw) as NotifItem[]);
        } else {
          const seeded = seedNotifications();
          setItems(seeded);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        }
      } catch {
        setItems(seedNotifications());
      }
    })();
  }, []);

  const unreadCount = items.filter((i) => !i.leida).length;

  const markAllRead = useCallback(async () => {
    const updated = items.map((i) => ({ ...i, leida: true }));
    setItems(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // silenciar
    }
  }, [items]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
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
        {unreadCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: colors.error,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 3,
              borderWidth: 1.5,
              borderColor: colors.background,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontFamily: fontFamily.interBold,
                fontSize: 9,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              marginTop: "auto",
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.glass,
              borderTopRightRadius: radius.glass,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: "70%",
              paddingBottom: spacing["2xl"],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: spacing.xl,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.headline,
                }}
              >
                Notificaciones
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.headline }}>
                  ×
                </Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <View style={{ padding: spacing["2xl"], alignItems: "center" }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.inter,
                    fontSize: fontSize.body,
                  }}
                >
                  Sin notificaciones nuevas
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 360 }}>
                  {items.map((n) => (
                    <View
                      key={n.id}
                      style={{
                        flexDirection: "row",
                        gap: spacing.md,
                        padding: spacing.xl,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: n.leida ? "transparent" : "rgba(0,180,216,0.04)",
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.glassBg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: fontSize.body }}>{TIPO_GLYPH[n.tipo]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontFamily: fontFamily.interMedium,
                            fontSize: fontSize.body,
                          }}
                        >
                          {n.texto}
                        </Text>
                        <Text
                          style={{
                            color: TIPO_COLOR[n.tipo],
                            fontFamily: fontFamily.mono,
                            fontSize: fontSize.caption,
                            marginTop: 2,
                          }}
                        >
                          {relativeTime(n.fechaIso)}
                        </Text>
                      </View>
                      {!n.leida ? (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.cyan,
                            marginTop: 4,
                          }}
                        />
                      ) : null}
                    </View>
                  ))}
                </ScrollView>

                <Pressable
                  onPress={markAllRead}
                  disabled={unreadCount === 0}
                  style={({ pressed }) => ({
                    margin: spacing.xl,
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.glassBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    opacity: unreadCount === 0 ? 0.4 : pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: colors.cyan,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: fontSize.caption,
                    }}
                  >
                    Marcar todas como leídas
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
