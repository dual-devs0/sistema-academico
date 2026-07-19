import { colors } from "../../constants/design";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useTabBarScroll } from "../../hooks/useHideOnScroll";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { SettingRow } from "../../components/ui/SettingRow";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import {
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../../constants/design";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useBiometry } from "../../hooks/useBiometry";
import {
  fetchPerfil,
  fetchResumen,
  type MiResumen,
  type UserInfo,
} from "../../services/dashboardService";

/**
 * Pantalla Perfil (reemplaza stub).
 *
 * Datos: reusa `fetchPerfil` y `fetchResumen` de dashboardService.
 * BACKEND TODO: resuelto, el backend ya expone `fuente_beca` y `legajo`.
 */
export default function PerfilScreen() {
  const { colors } = useTheme();
  const { scrollHandler, contentBottomPadding } = useTabBarScroll();
const { logout } = useAuth();
  const theme = useTheme();
  const biometry = useBiometry();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [resumen, setResumen] = useState<MiResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([
      fetchPerfil().catch(() => null),
      fetchResumen().catch(() => null),
    ]);
    setUser(u);
    setResumen(r);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const nombre = user?.nombre ?? user?.username ?? "";
  const legajo = user?.legajo ?? "————";
  const promedio = resumen?.promedio_general;
  const asistencias = resumen?.asistencia ?? [];
  const regularidadActiva =
    asistencias.length === 0
      ? true
      : asistencias.every((a) => (a.porcentaje ?? 100) >= 70);

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const handleBiometryToggle = async (v: boolean) => {
    if (!biometry.available) {
      showToast("Biometría no disponible en este dispositivo");
      return;
    }
    const res = await biometry.setEnabled(v);
    if (!res.ok) {
      if (res.error !== "Autenticación cancelada") {
        showToast(res.error ?? "No se pudo activar la biometría");
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Perfil" hideAvatar />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
          />
        }
      >
        {loading ? (
          <LoadingBody />
        ) : (
          <>
            <IdentitySection
              nombre={nombre}
              carrera={carreraLabel(user)}
              legajo={legajo}
              esBecado={!!user?.es_becado}
              fuenteBeca={user?.fuente_beca}
            />

            <SectionLabel text="Resumen académico" />
            <View
              style={{
                paddingHorizontal: spacing.xl,
                flexDirection: "row",
                gap: spacing.md,
              }}
            >
              <PromedioCard
                promedio={promedio}
                materiasCount={resumen?.cantidad_materias}
                style={{ flex: 1 }}
              />
              <RegularidadCard
                activa={regularidadActiva}
                style={{ flex: 1 }}
              />
            </View>

            <SectionLabel text="Ajustes de la app" />
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
              <SettingRow
                glyph="☾"
                label="Apariencia"
                hint={
                  theme.preference === "dark"
                    ? "Oscuro"
                    : theme.preference === "light"
                      ? "Claro"
                      : "Siguiendo el sistema"
                }
                variant="chevron"
                onPress={() => {
                  const next: Record<string, "system" | "dark" | "light"> = {
                    dark: "light",
                    light: "system",
                    system: "dark",
                  };
                  void theme.setPreference(next[theme.preference]);
                }}
                right={
                  <Text style={{ color: colors.cyan, fontFamily: fontFamily.interMedium, fontSize: fontSize.caption }}>
                    {theme.preference === "dark" ? "OSCURO" : theme.preference === "light" ? "CLARO" : "SISTEMA"}
                  </Text>
                }
              />
              <SettingRow
                glyph="◈"
                label="Biometría"
                hint={
                  !biometry.available
                    ? "No disponible en este dispositivo"
                    : biometry.enabled
                      ? "Activada al abrir la app"
                      : "Desactivada"
                }
                variant="toggle"
                toggled={biometry.enabled}
                onToggle={(v) => {
                  void handleBiometryToggle(v);
                }}
                disabled={!biometry.available || biometry.loading}
              />
            </View>

            <SectionLabel text="Centro de soporte" />
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
              <SettingRow
                glyph="?"
                label="Ayuda y preguntas frecuentes"
                variant="chevron"
                onPress={() => setFaqOpen(true)}
                right={<ChevronIcon />}
              />
              <SettingRow
                glyph="⚖"
                label="Términos y privacidad"
                variant="chevron"
                onPress={() => setTermsOpen(true)}
                right={<ChevronIcon />}
              />
            </View>

            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
              <Pressable
                onPress={() => setLogoutOpen(true)}
                style={({ pressed }) => ({
                  backgroundColor: colors.logoutBg,
                  borderWidth: 1,
                  borderColor: colors.logoutBorder,
                  borderRadius: radius.md,
                  paddingVertical: spacing.lg,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
              <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "rgba(239,68,68,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LogoutIcon />
                  </View>
                  <Text
                    style={{
                      color: colors.error,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: fontSize.body,
                      letterSpacing: 0.5,
                    }}
                  >
                    Cerrar Sesión
                  </Text>
              </Pressable>
            </View>

            <LogoutConfirmModal
              visible={logoutOpen}
              onClose={() => setLogoutOpen(false)}
              onConfirm={() => { setLogoutOpen(false); void logout(); }}
            />
          </>
        )}
      </Animated.ScrollView>

      <FaqModal visible={faqOpen} onClose={() => setFaqOpen(false)} />
      <TermsModal visible={termsOpen} onClose={() => setTermsOpen(false)} />

      {toast ? (
        <Animated.View
          entering={FadeIn.duration(350).easing(Easing.out(Easing.cubic))}
          style={{
            position: "absolute",
            left: spacing.xl,
            right: spacing.xl,
            bottom: spacing["3xl"],
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            shadowOpacity: 0.3,
            elevation: 6,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.interSemibold, fontSize: 13, flex: 1 }}>
            {toast}
          </Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

function IdentitySection({
  nombre,
  carrera,
  legajo,
  esBecado,
  fuenteBeca,
}: {
  nombre: string;
  carrera: string;
  legajo: string;
  esBecado: boolean;
  fuenteBeca?: string | null;
}) {
  const { colors } = useTheme();

  const becaLabel = esBecado ? (fuenteBeca ? `BECADO ${fuenteBeca.toUpperCase()}` : "BECADO INSTITUCIONAL") : null;
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={{
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
      }}
    >
      <View style={{ marginBottom: spacing.md }}>
        <UserAvatar nombre={nombre} size={80} borderWidth={2} />
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interBold,
          fontSize: fontSize.headlineLg,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {nombre || "Sin nombre"}
      </Text>
      <Text
        style={{
          color: colors.cyan,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.caption,
          marginTop: spacing.xs,
          letterSpacing: 0.5,
        }}
        numberOfLines={1}
      >
        {carrera}
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.md,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1,
            }}
          >
            LEGAJO:
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.caption,
            }}
          >
            {legajo}
          </Text>
        </View>

        {becaLabel ? (            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: "rgba(0,180,216,0.1)",
                borderWidth: 1,
                borderColor: "rgba(0,180,216,0.25)",
              }}
            >
              <Text style={{ fontSize: 14, color: colors.cyan }}>🎓</Text>
              <Text
                style={{
                  color: colors.cyan,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.caption,
                  letterSpacing: 1,
                }}
              >
                {becaLabel}
              </Text>
            </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// PromedioCard — moderna, sin rastro "IA"                          
// ---------------------------------------------------------------------------

function PromedioCard({
  promedio,
  materiasCount,
  style,
}: {
  promedio: number | null | undefined;
  materiasCount?: number;
  style?: ViewStyle;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  const val = promedio != null ? promedio.toFixed(2) : "—";
  const pct = promedio != null ? Math.min(promedio / 10, 1) : 0;

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? "#11151c" : colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* Barra superior gradiente */}
      <View style={{ height: 3, backgroundColor: colors.cyan }} />
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: 12,
            letterSpacing: 1.5,
          }}
        >
          PROMEDIO
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.monoBold,
            fontSize: 28,
            lineHeight: 30,
            letterSpacing: -1,
          }}
        >
          {val}
        </Text>
        {/* Ruler 0–10 */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "#1f2430" : "#e2e8f0",
            marginTop: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              backgroundColor: colors.cyan,
              borderRadius: 2,
            }}
          />
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: 12,
          }}
        >
          {materiasCount != null ? `${materiasCount} materias` : "—"}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RegularidadCard — status con pulso visual                          
// ---------------------------------------------------------------------------

function RegularidadCard({
  activa,
  style,
}: {
  activa: boolean;
  style?: ViewStyle;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  const dotGlow = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotGlow.value,
  }));

  useEffect(() => {
    if (activa) {
      dotGlow.value = withRepeat(
        withTiming(0.35, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      dotGlow.value = withTiming(1);
    }
    return () => cancelAnimation(dotGlow);
  }, [activa, dotGlow]);

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? "#11151c" : colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* Barra superior */}
      <View
        style={{
          height: 3,
          backgroundColor: activa ? "#22c55e" : "#f59e0b",
        }}
      />
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activa ? "#22c55e" : "#f59e0b",
              },
              dotStyle,
            ]}
          />
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: 12,
              letterSpacing: 1.5,
            }}
          >
            REGULARIDAD
          </Text>
        </View>
        <Text
          style={{
            color: activa ? "#22c55e" : "#f59e0b",
            fontFamily: fontFamily.interSemibold,
            fontSize: 15,
          }}
        >
          {activa ? "Activa" : "En riesgo"}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: 12,
          }}
        >
          {activa ? "Asistencia al día" : "Revisar asistencia"}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section label + loading
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontFamily: fontFamily.interMedium,
        fontSize: fontSize.caption,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
      }}
    >
      {text}
    </Text>
  );
}

function LoadingBody() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, alignItems: "center" }}>
      <SkeletonLoader shape="circle" height={80} width={80} />
      <SkeletonLoader height={22} width="60%" />
      <SkeletonLoader height={14} width="45%" />
      <View style={{ flexDirection: "row", gap: spacing.md, width: "100%", marginTop: spacing.lg }}>
        <SkeletonLoader height={100} style={{ flex: 1 }} />
        <SkeletonLoader height={100} style={{ flex: 1 }} />
      </View>
      <SkeletonLoader height={64} style={{ width: "100%", marginTop: spacing.md }} />
      <SkeletonLoader height={64} style={{ width: "100%" }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FAQ / Términos modals
// ---------------------------------------------------------------------------

const FAQ_ITEMS: {
  icon: string;
  pregunta: string;
  respuesta: string;
}[] = [
  {
    icon: "◈",
    pregunta: "¿Cómo registro asistencia?",
    respuesta:
      "Tocá el botón QR en el centro de la barra inferior, apuntá la cámara al código que muestra tu profesor y esperá la confirmación en pantalla.",
  },
  {
    icon: "◎",
    pregunta: "¿Dónde veo mis notas?",
    respuesta:
      "En la pestaña Cursos podés ver el porcentaje de asistencia y puntos de cada materia. Tocá una materia para ver el desglose completo de notas por componente.",
  },
  {
    icon: "⊜",
    pregunta: "¿Cómo pago mis cuotas?",
    respuesta:
      'Entrá a "Estado de Cuenta" desde el inicio. Ahí ves el saldo pendiente, las cuotas del ciclo y podés iniciar el pago.',
  },
];

function FaqModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <SupportModal visible={visible} onClose={onClose} title="Ayuda y preguntas frecuentes">
      <View style={{ gap: spacing.md }}>
        {FAQ_ITEMS.map((item, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(0,180,216,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.cyan, fontSize: 14 }}>{item.icon}</Text>
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                  flex: 1,
                }}
              >
                {item.pregunta}
              </Text>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.inter,
                fontSize: fontSize.caption,
                lineHeight: fontSize.caption * 1.6,
                paddingLeft: 36,
              }}
            >
              {item.respuesta}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: spacing.lg,
          padding: spacing.lg,
          backgroundColor: "rgba(0,180,216,0.06)",
          borderWidth: 1,
          borderColor: "rgba(0,180,216,0.2)",
          borderRadius: radius.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(0,180,216,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.cyan, fontSize: 16 }}>✉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
            }}
          >
            ¿Seguís con dudas?
          </Text>
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              marginTop: 2,
            }}
          >
            soporte@uca.edu.py
          </Text>
        </View>
      </View>
    </SupportModal>
  );
}

function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <SupportModal visible={visible} onClose={onClose} title="Términos y privacidad">
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.lg,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              lineHeight: fontSize.caption * 1.7,
            }}
          >
            Los datos académicos (calificaciones, asistencia, estado de cuenta y
            documentos) que ves en esta app pertenecen exclusivamente a tu
            relación con la{" "}
            <Text style={{ color: colors.cyan, fontFamily: fontFamily.interSemibold }}>
              Universidad Católica de Asunción — sede Caacupé
            </Text>
            , y se usan únicamente para brindarte el servicio del Portal Académico.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(0,180,216,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.cyan, fontSize: 13 }}>🛡</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
              }}
            >
              Privacidad de datos
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              lineHeight: fontSize.caption * 1.7,
            }}
          >
            No compartimos tu información académica ni personal con terceros
            ajenos a la universidad. El acceso biométrico, si lo activás, se
            procesa localmente en tu dispositivo — la app nunca almacena tu
            huella ni tu rostro, solo el resultado de la verificación del
            sistema operativo.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(0,180,216,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.cyan, fontSize: 13 }}>⚖</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
              }}
            >
              Tus derechos
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              lineHeight: fontSize.caption * 1.7,
            }}
          >
            Para consultas sobre tus datos o para solicitar su eliminación tras
            egresar, contactá a{" "}
            <Text style={{ color: colors.cyan, fontFamily: fontFamily.interSemibold }}>
              secretaría académica
            </Text>
            .
          </Text>
        </View>
      </View>
    </SupportModal>
  );
}

function SupportModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            marginTop: "auto",
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            borderBottomWidth: 0,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: spacing.xl,
              paddingBottom: spacing.md,
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
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <Animated.ScrollView
            style={{ padding: spacing.xl }}
            contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </Animated.ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ChevronIcon() {
  const { colors } = useTheme();

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={colors.textSecondary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogoutIcon() {
  const { colors } = useTheme();

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3H19a2 2 0 012 2v14a2 2 0 01-2 2h-4"
        stroke={colors.error}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 17l5-5-5-5"
        stroke={colors.error}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12H3"
        stroke={colors.error}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Logout Confirm Modal
// ---------------------------------------------------------------------------

function LogoutConfirmModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", padding: spacing.xl }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.logoutBorder,
            borderRadius: radius.lg,
            padding: spacing["2xl"],
            alignItems: "center",
            gap: spacing.lg,
            shadowColor: colors.error,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            shadowOpacity: 0.15,
            elevation: 10,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(239,68,68,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoutIcon />
          </View>

          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interBold,
              fontSize: fontSize.headline,
              textAlign: "center",
            }}
          >
            Cerrar sesión
          </Text>

          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
              lineHeight: fontSize.body * 1.5,
              marginTop: -spacing.sm,
            }}
          >
            ¿Confirmás que querés cerrar tu sesión?
          </Text>

          <View style={{ flexDirection: "row", gap: spacing.md, width: "100%", marginTop: spacing.sm }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                }}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: colors.error,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                shadowColor: colors.error,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                shadowOpacity: 0.4,
                elevation: 4,
              })}
            >
              <Text
                style={{
                  color: colors.background,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.body,
                }}
              >
                Cerrar sesión
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function carreraLabel(user: UserInfo | null): string {
  if (!user) return "—";
  if (user.carrera_nombre) return user.carrera_nombre;
  return "Sin carrera asignada";
}
