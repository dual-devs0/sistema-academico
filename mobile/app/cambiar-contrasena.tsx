// Alumno y Profesor. Cambiar contraseña (POST /auth/cambiar-contrasena).
import { colors } from "../constants/design";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { fontFamily, fontSize, radius, spacing } from "../constants/design";
import { useTheme } from "../hooks/useTheme";
import { cambiarContrasenaRequest } from "../services/authService";

export default function CambiarContrasenaScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    current.length > 0 && next.length >= 6 && confirm.length >= 6 && !loading;

  function validate(): string | null {
    if (current.length === 0) return "Ingresá tu contraseña actual.";
    if (next.length < 6) return "La nueva contraseña debe tener al menos 6 caracteres.";
    if (next === current) return "La nueva contraseña no puede ser igual a la actual.";
    if (next !== confirm) return "La confirmación no coincide con la nueva contraseña.";
    return null;
  }

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      setSuccess(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const detail = await cambiarContrasenaRequest({
        current_password: current,
        new_password: next,
      });
      setSuccess(detail || "Contraseña actualizada correctamente.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || "No se pudo cambiar la contraseña. Intentá de nuevo.");
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Cambiar contraseña" showBack onBackPress={() => router.back()} hideBell />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.inter,
                fontSize: fontSize.caption,
                lineHeight: fontSize.caption * 1.6,
              }}
            >
              Elegí una contraseña nueva. Debe tener al menos 6 caracteres y no
              puede ser igual a la actual.
            </Text>
          </Animated.View>

          <View style={{ gap: spacing.md }}>
            <PasswordField
              label="CONTRASEÑA ACTUAL"
              value={current}
              onChangeText={(t) => { setCurrent(t); setError(null); }}
              showPass={showCurrent}
              onToggleShow={() => setShowCurrent(s => !s)}
              autoFocus
            />
            <PasswordField
              label="NUEVA CONTRASEÑA"
              value={next}
              onChangeText={(t) => { setNext(t); setError(null); }}
              showPass={showNext}
              onToggleShow={() => setShowNext(s => !s)}
            />
            <PasswordField
              label="REPETIR NUEVA CONTRASEÑA"
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(null); }}
              showPass={showConfirm}
              onToggleShow={() => setShowConfirm(s => !s)}
            />
          </View>

          {error ? (
            <View
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.25)",
                borderRadius: radius.md,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.error, fontFamily: fontFamily.inter, fontSize: fontSize.caption, lineHeight: fontSize.caption * 1.5 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View
              style={{
                backgroundColor: "rgba(34,197,94,0.08)",
                borderWidth: 1,
                borderColor: "rgba(34,197,94,0.25)",
                borderRadius: radius.md,
                padding: spacing.md,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 15 }}>✓</Text>
              <Text style={{ color: "#22c55e", fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption, flex: 1 }}>
                {success}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => ({
              backgroundColor: "#0ea5e9",
              borderRadius: radius.pill,
              paddingVertical: spacing.lg,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: spacing.sm,
              opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1,
              shadowColor: "#0ea5e9",
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 16,
              shadowOpacity: canSubmit ? 0.35 : 0,
              elevation: canSubmit ? 4 : 0,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <LockIcon color="#ffffff" />
            )}
            <Text style={{ color: "#ffffff", fontFamily: fontFamily.interBold, fontSize: fontSize.body }}>
              {loading ? "Actualizando…" : "Actualizar contraseña"}
            </Text>
          </Pressable>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  showPass,
  onToggleShow,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  showPass: boolean;
  onToggleShow: () => void;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interBold,
          fontSize: 11.5,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.glassBg,
          borderWidth: 1.5,
          borderColor: focused ? colors.cyan : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPass}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textSecondary}
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: 15,
            paddingVertical: 16,
          }}
          selectionColor={colors.cyan}
          cursorColor={colors.cyan}
        />
        <Pressable onPress={onToggleShow} hitSlop={10} style={{ paddingLeft: spacing.md }}>
          <EyeIcon visible={showPass} color={focused ? colors.cyan : colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {visible ? null : (
        <Path d="M4 4L20 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}

function LockIcon({ color = "#ffffff" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 11V8a5 5 0 0110 0v3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
