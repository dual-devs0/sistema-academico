import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { recuperarContrasenaRequest } from "../../services/authService";
import { fontFamily, spacing } from "../../constants/design";

// ---------------------------------------------------------------------------
// Paleta v4 — blanco/celeste arriba, azul marino abajo.
// ---------------------------------------------------------------------------
const P = {
  navy: "#0d2137",
  navyMuted: "#16283c",
  headerLight: "#f4fafd",
  headerTitle: "#0d2137",
  heroAccent: "#2a86bd",
  tabTrack: "rgba(13,33,55,0.08)",
  tabTrackBorder: "rgba(13,33,55,0.14)",
  tabPill: "#06b6d4",
  tabInactive: "#2a5470",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.28)",
  inputBorderAccent: "rgba(56,189,248,0.5)",
  inputLabel: "#7fa6c4",
  placeholder: "#5f7488",
  white: "#ffffff",
  accent: "#38bdf8",
  accentMid: "#1479b8",
  gradA: "#06b6d4",
  gradB: "#0ea5e9",
  tileBg: "#16283c",
  tileBorder: "rgba(255,255,255,0.06)",
  tileIcon: "#2a9fd8",
  tileLabel: "#e8f3fa",
  mutedText: "#a9c4d8",
  bodyMuted: "#2a5470",
  error: "#fca5a5",
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HEADER_H = Math.round(SCREEN_H * 0.30);
const SAVED_CREDENTIALS_KEY = "uca.saved_credentials";
const SECRETARIA_EMAIL = "secretaria@uca.edu.py";

function WaveBackground({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: P.navy }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          backgroundColor: P.headerLight,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: 40,
        }}
      >
        <Image
          source={require("../../assets/uc_logo_sist_academico.png")}
          style={{ width: 420, height: 130, resizeMode: "contain", marginBottom: 8, tintColor: P.headerTitle }}
        />
        <Text
          style={{
            fontFamily: fontFamily.interBold,
            fontSize: 30,
            color: P.headerTitle,
            letterSpacing: -0.5,
            lineHeight: 34,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Svg
          width={SCREEN_W}
          height={80}
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          style={{ position: "absolute", bottom: -2 }}
        >
          <Path
            d="M0,75 C71,145 167,35 269,90 C340,125 410,65 500,82 L500,150 L0,150 Z"
            fill={P.navy}
          />
        </Svg>
      </View>
      {children}
    </View>
  );
}

function CapIcon({ fill = P.accent, size = 40 }: { fill?: string; size?: number }) {
  return (
    <Svg width={size} height={Math.round(size * 0.857)} viewBox="0 0 56 48" fill="none">
      <Path d="M28 4L2 16L28 28L54 16L28 4Z" fill={fill} />
      <Path d="M10 22V34C10 34 16 40 28 40C40 40 46 34 46 34V22L28 30L10 22Z" fill={fill} opacity={0.8} />
      <Rect x="50" y="16" width="4" height="13" rx="2" fill={fill} />
      <Circle cx="52" cy="30" r="3" fill={fill} />
    </Svg>
  );
}

function BackArrowIcon({ color = P.headerTitle }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Tab = "login" | "register";
type Screen = "main" | "forgot";
type BioType = "Face ID" | "Huella digital" | "Biométrico";

const TITLE = "PORTAL ACADÉMICO";

export default function LoginScreen() {
  const { login } = useAuth();

  const [screen, setScreen] = useState<Screen>("main");
  const [tab, setTab] = useState<Tab>("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [regDoc, setRegDoc] = useState("");
  const [regMatricula, setRegMatricula] = useState("");

  const [foreignOpen, setForeignOpen] = useState(false);
  const [foreignDoc, setForeignDoc] = useState("");
  const [foreignCountry, setForeignCountry] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bioType, setBioType] = useState<BioType>("Biométrico");
  const [loginSuccess, setLoginSuccess] = useState(false);

  const [fpDoc, setFpDoc] = useState("");
  const [fpMatricula, setFpMatricula] = useState("");
  const [fpSending, setFpSending] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordRef = useRef<TextInput>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBioType("Face ID");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBioType("Biométrico");
      }
    }).catch(() => { });
  }, []);

  const canSubmitLogin = username.trim().length > 0 && password.length > 0 && !submitting;
  const canSubmitReg = regDoc.trim().length > 0 && regMatricula.trim().length > 0 && !submitting;
  const canSubmitForgot = fpDoc.trim().length > 0 && fpMatricula.trim().length > 0 && !fpSending;

  async function handleLogin() {
    if (!canSubmitLogin) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const trimmed = username.trim();
      await login({ username: trimmed, password });
      try {
        await SecureStore.setItemAsync(SAVED_CREDENTIALS_KEY, JSON.stringify({ username: trimmed, password }));
      } catch { /* silent */ }
      setLoginSuccess(true);
    } catch (err) {
      const axErr = err as AxiosError<{ detail?: string }>;
      setErrorMsg(axErr.response?.data?.detail ?? "No se pudo iniciar sesión. Verificá los datos.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    if (!canSubmitReg) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      showToast("Solicitud de registro enviada.");
    } catch {
      setErrorMsg("No se pudo completar el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotSend() {
    if (!canSubmitForgot) return;
    setFpSending(true);
    try {
      const detail = await recuperarContrasenaRequest(fpDoc.trim());
      showToast(detail);
    } catch {
      showToast(`Contactá a secretaría: ${SECRETARIA_EMAIL}`);
    } finally {
      setFpSending(false);
      setFpDoc("");
      setFpMatricula("");
      setScreen("main");
    }
  }

  async function handleBiometricPress() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        showToast("Biometría no configurada en este dispositivo");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Ingresá tus datos biométricos para ingresar al Portal Académico",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (!result.success) {
        if (result.error !== "user_cancel") showToast("Autenticación fallida");
        return;
      }
      const raw = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);
      if (!raw) {
        showToast("Iniciá sesión manualmente una vez para habilitar el acceso biométrico");
        return;
      }
      const creds = JSON.parse(raw) as { username: string; password: string };
      setSubmitting(true);
      setErrorMsg(null);
      try {
        await login(creds);
        setLoginSuccess(true);
      }
      catch { showToast("No se pudo iniciar sesión con las credenciales guardadas"); }
      finally { setSubmitting(false); }
    } catch {
      showToast("Autenticación fallida");
    }
  }

  return (
    <WaveBackground title={TITLE}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <View style={{ height: HEADER_H }} />

        {screen === "main" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
              <CapIcon fill={P.accent} size={34} />
              <Text style={{ fontFamily: fontFamily.interSemibold, fontSize: 13.5, color: P.accent, textAlign: "center" }}>
                {tab === "login" ? "UCA Caacupé · Bienvenido, estudiante" : "UCA Caacupé · Creá tu cuenta"}
              </Text>
            </View>

            <View style={{ paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  borderRadius: 999,
                  padding: 5,
                }}
              >
                <Pressable
                  style={{
                    flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 999,
                    backgroundColor: tab === "login" ? P.tabPill : "transparent",
                  }}
                  onPress={() => { setTab("login"); setErrorMsg(null); }}
                >
                  <Text style={{ fontFamily: fontFamily.interBold, fontSize: 14, color: tab === "login" ? P.white : P.mutedText }}>
                    Iniciar Sesión
                  </Text>
                </Pressable>
                <Pressable
                  style={{
                    flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 999,
                    backgroundColor: tab === "register" ? P.tabPill : "transparent",
                  }}
                  onPress={() => { setTab("register"); setErrorMsg(null); }}
                >
                  <Text style={{ fontFamily: fontFamily.interBold, fontSize: 14, color: tab === "register" ? P.white : P.mutedText }}>
                    Registrarme
                  </Text>
                </Pressable>
              </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {tab === "login" ? (
                  <Animated.View
                    key="login-form"
                    entering={SlideInLeft.duration(220)}
                    exiting={FadeOut.duration(150)}
                    style={{ gap: spacing.md }}
                  >
                    <LabeledInput
                      label="Nro. de Documento"
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Nro. de Documento"
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                    <LabeledInput
                      ref={passwordRef}
                      label="Contraseña"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••••"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                      rightAccessory={
                        <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={12} style={{ padding: 10 }}>
                          <EyeIcon open={showPassword} />
                        </Pressable>
                      }
                    />

                    {foreignOpen ? (
                      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: spacing.md }}>
                        <LabeledInput
                          label="Pasaporte o documento extranjero"
                          accent
                          value={foreignDoc}
                          onChangeText={setForeignDoc}
                          placeholder="Ej: AB123456"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <LabeledInput
                          label="País del documento"
                          accent
                          value={foreignCountry}
                          onChangeText={setForeignCountry}
                          placeholder="Ej: Argentina"
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </Animated.View>
                    ) : null}

                    {errorMsg ? <ErrorText msg={errorMsg} /> : null}

                    <GradientButton
                      label="Ingresar"
                      disabled={!canSubmitLogin}
                      loading={submitting}
                      onPress={handleLogin}
                      showArrow
                    />
                  </Animated.View>
                ) : (
                  <Animated.View
                    key="register-form"
                    entering={SlideInRight.duration(220)}
                    exiting={FadeOut.duration(150)}
                    style={{ gap: spacing.md }}
                  >
                    <LabeledInput
                      label="Nro. de Documento"
                      value={regDoc}
                      onChangeText={setRegDoc}
                      placeholder="Nro. de Documento"
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                    <LabeledInput
                      label="Matrícula"
                      value={regMatricula}
                      onChangeText={setRegMatricula}
                      placeholder="Matrícula"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleRegister}
                    />

                    {foreignOpen ? (
                      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: spacing.md }}>
                        <LabeledInput
                          label="Pasaporte o documento extranjero"
                          accent
                          value={foreignDoc}
                          onChangeText={setForeignDoc}
                          placeholder="Ej: AB123456"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <LabeledInput
                          label="País del documento"
                          accent
                          value={foreignCountry}
                          onChangeText={setForeignCountry}
                          placeholder="Ej: Argentina"
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </Animated.View>
                    ) : null}

                    {errorMsg ? <ErrorText msg={errorMsg} /> : null}

                    <GradientButton
                      label="Registrarme"
                      disabled={!canSubmitReg}
                      loading={submitting}
                      onPress={handleRegister}
                    />
                  </Animated.View>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: spacing.lg, paddingBottom: spacing.md }}>
                  <QuickTile
                    active={foreignOpen}
                    icon={<GlobeIcon />}
                    label={"Documento\nextranjero"}
                    onPress={() => setForeignOpen((v) => !v)}
                  />
                  <QuickTile
                    icon={<FingerprintIcon />}
                    label={bioType}
                    onPress={handleBiometricPress}
                  />
                  <QuickTile
                    icon={<KeyIcon />}
                    label={"Olvidé mi\ncontraseña"}
                    onPress={() => setScreen("forgot")}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{ height: Math.max(HEADER_H - 300, 0) }} />
            <Pressable
              onPress={() => setScreen("main")}
              hitSlop={16}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                alignSelf: "flex-start",
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BackArrowIcon color={P.white} />
              </View>
              <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15 }}>
                Volver
              </Text>
            </Pressable>

            <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing["3xl"] }}>
              <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 26, textAlign: "center" }}>
                Recuperar contraseña
              </Text>
              <Text style={{ color: P.mutedText, fontFamily: fontFamily.inter, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing["3xl"] }}>
                Le enviaremos un correo electrónico con su nueva contraseña.
              </Text>

              <View style={{ gap: spacing.md }}>
                <LabeledInput
                  value={fpDoc}
                  onChangeText={setFpDoc}
                  placeholder="Nro. de Documento"
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <LabeledInput
                  value={fpMatricula}
                  onChangeText={setFpMatricula}
                  placeholder="Matrícula"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <GradientButton
                  label="Recuperar"
                  disabled={!canSubmitForgot}
                  loading={fpSending}
                  onPress={handleForgotSend}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {toast ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{
            position: "absolute",
            left: spacing.xl,
            right: spacing.xl,
            bottom: spacing["3xl"],
            backgroundColor: "#123a52",
            borderWidth: 1,
            borderColor: "rgba(56,189,248,0.4)",
            borderRadius: 16,
            padding: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <CheckIcon />
          <Text style={{ color: "#dff2fc", fontFamily: fontFamily.interSemibold, fontSize: 13.5, flex: 1 }}>
            {toast}
          </Text>
        </Animated.View>
      ) : null}

      {loginSuccess ? (
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: P.navy,
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.md,
          }}
        >
          <Animated.View entering={ZoomIn.duration(350).springify()}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(56,189,248,0.15)", alignItems: "center", justifyContent: "center" }}>
              <CheckIcon />
            </View>
          </Animated.View>
          <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 20 }}>¡Bienvenido!</Text>
        </Animated.View>
      ) : null}
    </WaveBackground>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return (
    <Text style={{ color: P.error, fontFamily: fontFamily.inter, fontSize: 13, textAlign: "center" }}>
      {msg}
    </Text>
  );
}

const LabeledInput = React.forwardRef<TextInput, {
  label?: string;
  rightAccessory?: React.ReactNode;
  accent?: boolean;
} & React.ComponentProps<typeof TextInput>>(function LabeledInput({
  label,
  rightAccessory,
  accent,
  ...inputProps
}, ref) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused || accent ? P.inputBorderAccent : P.inputBorder;
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontFamily: fontFamily.interBold, fontSize: 11.5, color: P.inputLabel, textAlign: "center", letterSpacing: 0.4 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: P.inputBg,
          borderWidth: 1.5,
          borderColor,
          borderRadius: 999,
          paddingHorizontal: spacing.lg,
        }}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={P.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: P.white,
            fontFamily: fontFamily.interSemibold,
            fontSize: 15,
            paddingVertical: 16,
            paddingHorizontal: 10,
            textAlign: "left",
          }}
          selectionColor={P.accent}
          cursorColor={P.accent}
          {...inputProps}
        />
        {rightAccessory}
      </View>
    </View>
  );
});

function GradientButton({
  label,
  disabled,
  loading,
  onPress,
  showArrow,
}: {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  showArrow?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.9 : 1, marginTop: spacing.xs })}>
      <LinearGradient
        colors={disabled ? ["#2a3744", "#232f3a"] : [P.gradA, P.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 999,
          paddingVertical: 17,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          shadowColor: P.accentMid,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 20,
          shadowOpacity: disabled ? 0 : 0.45,
          elevation: disabled ? 0 : 6,
        }}
      >
        {loading
          ? <ActivityIndicator color={P.white} />
          : (
            <>
              {showArrow ? <ArrowRightIcon /> : null}
              <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15.5 }}>{label}</Text>
            </>
          )
        }
      </LinearGradient>
    </Pressable>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: "center", gap: spacing.sm, opacity: pressed ? 0.75 : 1 })}
      hitSlop={6}
    >
      <View style={{
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: P.tileBg,
        borderWidth: 1,
        borderColor: active ? P.accent : P.tileBorder,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {icon}
      </View>
      <Text style={{ color: P.tileLabel, fontFamily: fontFamily.interSemibold, fontSize: 12.5, textAlign: "center", lineHeight: 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke={P.inputLabel} strokeWidth={2} />
        <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={P.inputLabel} strokeWidth={2} />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3l18 18" stroke={P.inputLabel} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.6 5.2A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a15.6 15.6 0 01-3.4 4.3M6.5 6.6C4 8.3 2 12 2 12a15.9 15.9 0 004.2 4.8A10.6 10.6 0 0012 19c1 0 1.9-.1 2.8-.4" stroke={P.inputLabel} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9.9 10a3 3 0 004.2 4.2" stroke={P.inputLabel} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3h14a2 2 0 012 2v18a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke={P.tileIcon} strokeWidth={1.9} />
      <Path d="M9 8h6M9 12h6M9 16h3" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function FingerprintIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M12 11a3 3 0 013 3c0 2.5-.5 4.5-1.2 6.2" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M9.2 20.5c.9-1.8 1.3-4 1.3-6.5a1.5 1.5 0 013 0" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6.5 18.2C7.5 16.3 8 14.3 8 12a4 4 0 017-2.6" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M4.6 15A9 9 0 014 12a8 8 0 0112.6-6.5" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M19.5 9.5c.3.8.5 1.6.5 2.5 0 1.2-.1 2.3-.3 3.4" stroke={P.tileIcon} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function KeyIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill={P.tileIcon} stroke="none">
      <Path d="M8 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
      <Path d="M11 11.6h10v2.8H11z" />
      <Path d="M16.5 12v4h2.6v-4z" />
    </Svg>
  );
}

function ArrowRightIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M10 17l5-5-5-5" stroke={P.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 12H3" stroke={P.white} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4 10-10" stroke={P.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
