import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { APP_NAME, APP_VERSION, getDeviceLabel } from "../../config";
import { fontFamily, spacing, radius, fontSize } from "../../constants/design";
import {
  checkForUpdate,
  downloadAndReloadUpdate,
  type UpdateStatus,
} from "../../services/updateService";

interface InfoAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InfoAppModal({ visible, onClose }: InfoAppModalProps) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  const [state, setState] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [otaError, setOtaError] = useState<string | null>(null);

  const doCheck = useCallback(async () => {
    setChecking(true);
    setOtaError(null);
    try {
      const res = await checkForUpdate();
      setState(res);
    } catch {
      setState(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (visible) doCheck();
  }, [visible, doCheck]);

  const hasUpdate = state ? state.otaAvailable || state.backendNewer : false;

  const onUpdatePress = async () => {
    if (state?.otaAvailable) {
      setApplying(true);
      setOtaError(null);
      const res = await downloadAndReloadUpdate();
      if (!res.ok) {
        setOtaError(
          res.reason === "ota-disabled"
            ? "Este celular necesita una versión nueva. Abrí el enlace para descargarla."
            : res.reason === "no-update"
              ? "No hay una actualización OTA descargable ahora."
              : "No se pudo descargar la actualización. Intentá de nuevo.",
        );
      }
      setApplying(false);
      return;
    }
    if (state?.updateUrl) {
      Linking.openURL(state.updateUrl);
    }
  };

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
            padding: spacing.xl,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interBold,
                fontSize: fontSize.headline,
              }}
            >
              Información de la app
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

          <View style={{ gap: spacing.md }}>
            <InfoRow label="App" value={APP_NAME} colors={colors} />
            <InfoRow label="Versión actual" value={APP_VERSION} colors={colors} />
            <InfoRow label="Dispositivo" value={getDeviceLabel()} colors={colors} />

            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: spacing.sm,
              }}
            />

            {checking ? (
              <StatusBadge
                colors={colors}
                text="Verificando actualizaciones…"
                accent={colors.textSecondary}
              />
            ) : !state ? (
              <Pressable
                onPress={doCheck}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: spacing.md,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.body,
                  }}
                >
                  Buscar actualizaciones
                </Text>
              </Pressable>
            ) : !hasUpdate ? (
              <StatusBadge
                colors={colors}
                text={`✓ Tenés la versión más reciente (${APP_VERSION})`}
                accent="#22c55e"
                bg="rgba(34,197,94,0.1)"
                border="rgba(34,197,94,0.3)"
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                <StatusBadge
                  colors={colors}
                  text={
                    state.otaAvailable
                      ? "Actualización OTA disponible. Descargala y recargá."
                      : `Nueva versión disponible: ${state.latestVersion ?? "—"}`
                  }
                  accent={colors.cyan}
                  bg="rgba(0,180,216,0.1)"
                  border="rgba(0,180,216,0.3)"
                />
                {state.releaseNotes ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: fontSize.caption,
                      textAlign: "center",
                    }}
                  >
                    {state.releaseNotes}
                  </Text>
                ) : null}
                {otaError ? (
                  <Text
                    style={{
                      color: colors.error,
                      fontFamily: fontFamily.inter,
                      fontSize: fontSize.caption,
                      textAlign: "center",
                    }}
                  >
                    {otaError}
                  </Text>
                ) : null}
                {state.otaAvailable ? (
                  <Pressable
                    onPress={onUpdatePress}
                    disabled={applying}
                    style={{
                      backgroundColor: colors.cyan,
                      borderRadius: radius.md,
                      paddingVertical: spacing.md,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: spacing.sm,
                      opacity: applying ? 0.7 : 1,
                    }}
                  >
                    {applying ? (
                      <ActivityIndicator color="#fff" />
                    ) : null}
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: fontFamily.interSemibold,
                        fontSize: fontSize.body,
                      }}
                    >
                      {applying ? "Descargando…" : "Actualizar y recargar"}
                    </Text>
                  </Pressable>
                ) : state.updateUrl ? (
                  <Pressable
                    onPress={onUpdatePress}
                    style={{
                      backgroundColor: colors.cyan,
                      borderRadius: radius.md,
                      paddingVertical: spacing.md,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: fontFamily.interSemibold,
                        fontSize: fontSize.body,
                      }}
                    >
                      Actualizar app
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatusBadge({
  colors,
  text,
  accent,
  bg = "rgba(0,180,216,0.1)",
  border = "rgba(0,180,216,0.3)",
}: {
  colors: ReturnType<typeof useTheme>["colors"];
  text: string;
  accent: string;
  bg?: string;
  border?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: accent,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.caption,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.body,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.body,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
