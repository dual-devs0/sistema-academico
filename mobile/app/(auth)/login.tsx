import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
  timing,
} from "../../constants/design";

/**
 * Pantalla de login.
 */
export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Breathing glow del botón Ingresar (opacity 0.85 ↔ 1.0, easing suave).
  const glow = useSharedValue(0.85);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, {
        duration: timing.breathe,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glow);
    };
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    shadowOpacity: 0.35 + (glow.value - 0.85) * 2,
  }));

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await login({ username: username.trim(), password });
    } catch (err) {
      const axErr = err as AxiosError<{ detail?: string }>;
      const detail = axErr.response?.data?.detail;
      setErrorMsg(detail ?? "No se pudo iniciar sesión. Verificá los datos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require("../../assets/campus.jpg")}
        style={StyleSheetAbs.fill}
        resizeMode="cover"
      />
      <View
        style={{
          ...StyleSheetAbs.fill,
          backgroundColor: colors.overlayLogin,
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing["3xl"],
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", marginBottom: spacing["3xl"] }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.cyan,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interBold,
                    fontSize: fontSize.bodyLg,
                    letterSpacing: 1,
                  }}
                >
                  UCA
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.headlineLg,
                  marginBottom: spacing.xs,
                }}
              >
                Portal Académico
              </Text>
              <Text
                style={{
                  color: colors.textAccent,
                  fontFamily: fontFamily.inter,
                  fontSize: fontSize.caption,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Universidad Católica
              </Text>
            </View>

            <View style={{ borderRadius: radius.glass, overflow: "hidden" }}>
              <BlurView
                intensity={30}
                tint="dark"
                style={{
                  padding: spacing.xl,
                  borderRadius: radius.glass,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.glassBg,
                }}
              >
                <FieldLabel>Documento</FieldLabel>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Nro. de documento"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={inputStyle}
                />

                <View style={{ height: spacing.lg }} />

                <FieldLabel>Contraseña</FieldLabel>
                <View style={{ position: "relative" }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Contraseña"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    style={inputStyle}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    style={{
                      position: "absolute",
                      right: spacing.md,
                      top: 0,
                      bottom: 0,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontFamily: fontFamily.interMedium,
                        fontSize: fontSize.caption,
                      }}
                    >
                      {showPassword ? "OCULTAR" : "VER"}
                    </Text>
                  </Pressable>
                </View>

                {errorMsg ? (
                  <Text
                    style={{
                      color: colors.error,
                      fontFamily: fontFamily.inter,
                      fontSize: fontSize.caption,
                      marginTop: spacing.md,
                    }}
                  >
                    {errorMsg}
                  </Text>
                ) : null}

                <View style={{ height: spacing.xl }} />

                <Animated.View
                  style={[
                    {
                      shadowColor: colors.cyan,
                      shadowOffset: { width: 0, height: 0 },
                      shadowRadius: 16,
                      elevation: 8,
                    },
                    glowStyle,
                  ]}
                >
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={({ pressed }) => ({
                      backgroundColor: canSubmit ? colors.cyan : "#1e3a44",
                      borderRadius: radius.md,
                      paddingVertical: spacing.lg,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#0a0e17" />
                    ) : (
                      <Text
                        style={{
                          color: "#0a0e17",
                          fontFamily: fontFamily.interSemibold,
                          fontSize: fontSize.bodyLg,
                          letterSpacing: 0.5,
                        }}
                      >
                        Ingresar
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              </BlurView>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: spacing["3xl"],
              }}
            >
              <QuickAction label="Biométrico" glyph="●" />
              <QuickAction label="Olvidé mi clave" glyph="?" />
              <QuickAction label="Doc. extranjero" glyph="◆" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontFamily: fontFamily.interMedium,
        fontSize: fontSize.caption,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

function QuickAction({ label, glyph }: { label: string; glyph: string }) {
  return (
    <Pressable style={{ alignItems: "center", gap: spacing.sm, flex: 1 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.glassBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.cyan, fontSize: fontSize.headline }}>
          {glyph}
        </Text>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.caption,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const inputStyle = {
  backgroundColor: "rgba(10,14,23,0.6)",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  color: colors.textPrimary,
  fontFamily: fontFamily.inter,
  fontSize: fontSize.body,
} as const;

const StyleSheetAbs = {
  fill: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};
