import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { GlassCard } from "../../components/ui/GlassCard";
import { StatCard } from "../../components/ui/StatCard";
import { CyanBadge } from "../../components/ui/CyanBadge";
import { SettingRow } from "../../components/ui/SettingRow";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import {
  colors,
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
 * BACKEND TODO: no hay endpoint que devuelva `fuente_beca` en /alumno/mi-perfil.
 * Hoy solo llega `es_becado: boolean`. Mostramos "BECADO INSTITUCIONAL" por
 * defecto cuando `es_becado=true`; cuando el backend agregue `fuente_beca`
 * (ej. "itaipu" / "institucional") switchamos el label.
 */
export default function PerfilScreen() {
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
  const legajo = user ? formatLegajo(user.id) : "————";
  const promedio = resumen?.promedio_general;
  const asistencias = resumen?.asistencia ?? [];
  const regularidadActiva =
    asistencias.length === 0
      ? true
      : asistencias.every((a) => (a.porcentaje ?? 100) >= 70);

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Confirmás que querés cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ],
    );
  };

  const handleBiometryToggle = async (v: boolean) => {
    if (!biometry.available) {
      Alert.alert(
        "Biometría no disponible",
        "El dispositivo no tiene biometría configurada.",
      );
      return;
    }
    const res = await biometry.setEnabled(v);
    if (!res.ok) {
      Alert.alert("No se pudo activar biometría", res.error ?? "Intentá de nuevo.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Perfil" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
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
            />

            <SectionLabel text="Resumen académico" />
            <View
              style={{
                paddingHorizontal: spacing.xl,
                flexDirection: "row",
                gap: spacing.md,
              }}
            >
              <StatCard
                label="PROMEDIO"
                value={promedio != null ? promedio.toFixed(2) : "—"}
                footer={
                  resumen?.cantidad_materias
                    ? `${resumen.cantidad_materias} materias`
                    : "sin datos"
                }
                style={{ flex: 1 }}
              />
              <StatCard
                label="REGULARIDAD"
                value={regularidadActiva ? "● Activa" : "● Riesgo"}
                valueColor={regularidadActiva ? colors.success : colors.warning}
                footer={regularidadActiva ? "asistencia OK" : "revisar asistencia"}
                style={{ flex: 1 }}
              />
            </View>

            <SectionLabel text="Ajustes de la app" />
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
              <SettingRow
                glyph="☾"
                label="Modo Oscuro"
                hint={
                  theme.preference === "dark"
                    ? "Forzado — siempre oscuro"
                    : "Siguiendo el sistema"
                }
                variant="toggle"
                toggled={theme.preference === "dark"}
                onToggle={(v) => {
                  void theme.setPreference(v ? "dark" : "system");
                }}
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
              />
              <SettingRow
                glyph="§"
                label="Términos y privacidad"
                variant="chevron"
                onPress={() => setTermsOpen(true)}
              />
            </View>

            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
              <Pressable
                onPress={handleLogout}
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
                <Text style={{ color: "#fca5a5", fontSize: fontSize.body }}>⎋</Text>
                <Text
                  style={{
                    color: "#fca5a5",
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.body,
                    letterSpacing: 0.5,
                  }}
                >
                  Cerrar Sesión
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <FaqModal visible={faqOpen} onClose={() => setFaqOpen(false)} />
      <TermsModal visible={termsOpen} onClose={() => setTermsOpen(false)} />
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
}: {
  nombre: string;
  carrera: string;
  legajo: string;
  esBecado: boolean;
}) {
  const becaLabel = esBecado ? "BECADO INSTITUCIONAL" : null;
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

        {becaLabel ? (
          <CyanBadge label={becaLabel} glyph="🔒" variant="dim" size="sm" />
        ) : null}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Section label + loading
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
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

const FAQ_ITEMS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Cómo registro asistencia?",
    respuesta:
      "Tocá el botón QR en el centro de la barra inferior, apuntá la cámara al código que muestra tu profesor y esperá la confirmación en pantalla.",
  },
  {
    pregunta: "¿Dónde veo mis notas?",
    respuesta:
      "En la pestaña Cursos podés ver el porcentaje de asistencia y puntos de cada materia. Tocá una materia para ver el desglose completo de notas por componente.",
  },
  {
    pregunta: "¿Cómo pago mis cuotas?",
    respuesta:
      'Entrá a "Estado de Cuenta" desde el inicio. Ahí ves el saldo pendiente, las cuotas del ciclo y podés iniciar el pago.',
  },
];

function FaqModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <SupportModal visible={visible} onClose={onClose} title="Ayuda y preguntas frecuentes">
      {FAQ_ITEMS.map((item, i) => (
        <View
          key={i}
          style={{
            marginBottom: spacing.lg,
            paddingBottom: spacing.lg,
            borderBottomWidth: i === FAQ_ITEMS.length - 1 ? 0 : 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
              marginBottom: spacing.xs,
            }}
          >
            {item.pregunta}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              lineHeight: fontSize.caption * 1.5,
            }}
          >
            {item.respuesta}
          </Text>
        </View>
      ))}
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interMedium,
          fontSize: fontSize.caption,
        }}
      >
        ¿Seguís con dudas? Escribinos a{" "}
        <Text style={{ color: colors.cyan }}>soporte@uca.edu.py</Text>
      </Text>
    </SupportModal>
  );
}

function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <SupportModal visible={visible} onClose={onClose} title="Términos y privacidad">
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.caption,
          lineHeight: fontSize.caption * 1.6,
        }}
      >
        Los datos académicos (calificaciones, asistencia, estado de cuenta y
        documentos) que ves en esta app pertenecen exclusivamente a tu
        relación con la Universidad Católica de Asunción — sede Caacupé, y se
        usan únicamente para brindarte el servicio del Portal Académico.
        {"\n\n"}
        No compartimos tu información académica ni personal con terceros
        ajenos a la universidad. El acceso biométrico, si lo activás, se
        procesa localmente en tu dispositivo — la app nunca almacena tu
        huella ni tu rostro, solo el resultado de la verificación del
        sistema operativo.
        {"\n\n"}
        Para consultas sobre tus datos o para solicitar su eliminación tras
        egresar, contactá a secretaría académica.
      </Text>
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
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
            maxHeight: "75%",
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
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.headline }}>
                ×
              </Text>
            </Pressable>
          </View>
          <ScrollView style={{ padding: spacing.xl }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLegajo(userId: number): string {
  const s = String(userId).padStart(8, "0");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function carreraLabel(user: UserInfo | null): string {
  if (!user) return "—";
  if (user.carrera_id == null) return "Sin carrera asignada";
  return `Carrera #${user.carrera_id}`;
}
