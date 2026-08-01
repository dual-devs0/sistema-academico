import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  Linking,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { APP_NAME, APP_VERSION } from "../../config";
import { fontFamily, spacing, radius, fontSize } from "../../constants/design";
import { checkVersion, compareVersions, type VersionInfo } from "../../services/versionService";

interface InfoAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InfoAppModal({ visible, onClose }: InfoAppModalProps) {
  const { colors, effective } = useTheme();
  const isDark = effective === "dark";
  const [remote, setRemote] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "up-to-date" | "update-available">("idle");

  const doCheck = useCallback(async () => {
    setChecking(true);
    setStatus("checking");
    try {
      const info = await checkVersion();
      setRemote(info);
      const cmp = compareVersions(APP_VERSION, info.latestVersion);
      setStatus(cmp === "up-to-date" ? "up-to-date" : "update-available");
    } catch {
      setStatus("idle");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (visible) doCheck();
  }, [visible, doCheck]);

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
            <InfoRow
              label="Dispositivo"
              value={`${Platform.OS} ${Platform.Version}`}
              colors={colors}
            />

            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: spacing.sm,
              }}
            />

            {checking ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.inter,
                  fontSize: fontSize.caption,
                  textAlign: "center",
                }}
              >
                Verificando actualizaciones...
              </Text>
            ) : status === "up-to-date" ? (
              <Text
                style={{
                  color: "#22c55e",
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.caption,
                  textAlign: "center",
                }}
              >
                ✓ Tenés la versión más reciente
              </Text>
            ) : status === "update-available" && remote ? (
              <View style={{ gap: spacing.md }}>
                <Text
                  style={{
                    color: colors.cyan,
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.caption,
                    textAlign: "center",
                  }}
                >
                  Nueva versión disponible: {remote.latestVersion}
                </Text>
                {remote.releaseNotes ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: fontSize.caption,
                      textAlign: "center",
                    }}
                  >
                    {remote.releaseNotes}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => remote.updateUrl && Linking.openURL(remote.updateUrl)}
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
              </View>
            ) : (
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
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
