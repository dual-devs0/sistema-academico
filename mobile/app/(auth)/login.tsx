import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { recuperarContrasenaRequest } from "../../services/authService";
import { fontFamily, fontSize, spacing } from "../../constants/design";

// ---------------------------------------------------------------------------
// Paleta propia de esta pantalla — fiel al mockup de referencia
// (UCA Caacupe Login v3), distinta de la paleta cyan genérica del resto
// de la app para que el login tenga identidad visual propia.
// ---------------------------------------------------------------------------
const P = {
  bg: "#0a0e13",
  card: "#141b23",
  input: "#0c1117",
  border: "rgba(255,255,255,0.09)",
  borderSoft: "rgba(255,255,255,0.07)",
  accent: "#38bdf8",
  accentMid: "#1479b8",
  accentStrong: "#1e90d6",
  mutedIcon: "#5f7488",
  mutedText: "#8fa3b8",
  heroSub: "#bfe3f7",
  white: "#ffffff",
  error: "#f87171",
  wave1: "#0e5a8a",
  wave2: "#1479b8",
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HEADER_H = Math.round(SCREEN_H * 0.3);
const SAVED_CREDENTIALS_KEY = "uca.saved_credentials";
const SECRETARIA_EMAIL = "secretaria@uca.edu.py";

// ---------------------------------------------------------------------------
// Wave header — dos curvas superpuestas, viewBox fijo 430x300 estirado
// sin mantener aspect ratio (igual que el mockup de referencia). Se
// "voltea" horizontalmente al cambiar de pestaña, como en la referencia.
// ---------------------------------------------------------------------------
function HeaderWave({ flip }: { flip: SharedValue<number> }) {
  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flip.value }],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, height: HEADER_H, overflow: "hidden" },
        flipStyle,
      ]}
      pointerEvents="none"
    >
      <Svg width={SCREEN_W} height={HEADER_H} viewBox="0 0 430 300" preserveAspectRatio="none">
        <Path
          d="M0,0 L430,0 L430,110 C330,190 250,60 140,130 C70,175 30,150 0,190 Z"
          fill={P.wave1}
          opacity={0.55}
        />
        <Path
          d="M0,0 L430,0 L430,70 C320,150 230,30 120,100 C55,140 25,115 0,150 Z"
          fill={P.wave2}
          opacity={0.85}
        />
      </Svg>
    </Animated.View>
  );
}

function CapIcon() {
  return (
    <Svg width={40} height={34} viewBox="0 0 52 44" fill="none">
      <Path d="M26,2 50,13 26,24 2,13 Z" fill={P.white} />
      <Path d="M12 18 v9 c0,4 7,7 14,7 s14,-3 14,-7 v-9" fill="none" stroke={P.white} strokeWidth={3} />
      <Path d="M50 13 L50 28" stroke={P.white} strokeWidth={2.5} />
      <Path d="M50 30a2.5 2.5 0 100 .01z" fill={P.white} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
type Tab = "login" | "register";
type BioType = "Face ID" | "Huella digital" | "Biométrico";

export default function LoginScreen() {
  const { login } = useAuth();

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [bioType, setBioType] = useState<BioType>("Biométrico");
  const [foreignLoginOpen, setForeignLoginOpen] = useState(false);
  const [foreignLoginDoc, setForeignLoginDoc] = useState("");
  const [foreignLoginPw, setForeignLoginPw] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Detecta el tipo real de biometría del dispositivo (reemplaza el
  // sniffing de user-agent del mockup web por la API nativa real).
  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBioType("Face ID");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBioType("Huella digital");
      }
    }).catch(() => {});
  }, []);

  // Tab indicator (píldora que se desliza) — el contenedor de tabs NUNCA
  // cambia de tamaño/posición al alternar pestañas, solo la píldora interna
  // se traslada con translateX. Un solo lugar fijo, como se pidió.
  const TAB_PAD = 5;
  // ancho de la pista de tabs = ancho de card menos paddings — se calcula
  // una sola vez a partir del layout real del card (medido en onLayout).
  const [cardW, setCardW] = useState(SCREEN_W - spacing.lg * 2 - spacing.lg * 2);
  const TAB_TRACK_W = cardW;
  const tabSlide = useSharedValue(0);
  const waveFlip = useSharedValue(1);
  useEffect(() => {
    const toLogin = tab === "login";
    tabSlide.value = withTiming(toLogin ? 0 : 1, { duration: 320, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    waveFlip.value = withTiming(toLogin ? 1 : -1, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  }, [tab]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabSlide.value * (TAB_TRACK_W - TAB_PAD * 2) / 2 }],
  }));

  const canSubmitLogin = username.trim().length > 0 && password.length > 0 && !submitting;
  const canSubmitReg = regDoc.trim().length > 0 && regMatricula.trim().length > 0 && !submitting;

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
      // TODO: llamar endpoint de registro
      showToast("Solicitud de registro enviada.");
    } catch {
      setErrorMsg("No se pudo completar el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeBiometricAuth() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setBiometricOpen(false);
        showToast("Biometría no configurada en este dispositivo");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Ingresá tus datos biométricos para ingresar al portal académico",
        cancelLabel: "Cancelar",
      });
      if (!result.success) {
        setBiometricOpen(false);
        showToast("Autenticación fallida");
        return;
      }
      const raw = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);
      if (!raw) {
        setBiometricOpen(false);
        showToast("Iniciá sesión manualmente una vez para habilitar el acceso biométrico");
        return;
      }
      const creds = JSON.parse(raw) as { username: string; password: string };
      setBiometricOpen(false);
      setSubmitting(true);
      setErrorMsg(null);
      try { await login(creds); }
      catch { showToast("No se pudo iniciar sesión con las credenciales guardadas"); }
      finally { setSubmitting(false); }
    } catch {
      setBiometricOpen(false);
      showToast("Autenticación fallida");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ height: HEADER_H, overflow: "hidden" }}>
              <HeaderWave flip={waveFlip} />
              {/* Logo + Portal Académico — centrado, como la referencia */}
              <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 2 }}>
                <View style={{ alignItems: "center", gap: 2, paddingBottom: 4 }}>
                  <Image
                    source={require("../../assets/uc-logo.png")}
                    style={{ width: 60, height: 60, resizeMode: "contain" }}
                  />
                  <Text style={{ fontSize: 12.5, fontFamily: fontFamily.interBold, letterSpacing: 1.8, textTransform: "uppercase", color: P.heroSub }}>
                    Portal Académico
                  </Text>
                </View>
                {/* Cap + greeting — alineado a la izquierda */}
                <View style={{ marginBottom: spacing.sm }}>
                  <CapIcon />
                </View>
                <Text style={{ fontFamily: fontFamily.interBold, fontSize: 30, lineHeight: 34, color: P.white }}>
                  {tab === "login" ? "¡Hola!" : "Crear cuenta"}
                </Text>
                <Text style={{ fontFamily: fontFamily.interSemibold, fontSize: 14, color: P.heroSub }}>
                  {tab === "login" ? "Bienvenido, estudiante" : "Registrate con tus datos UCA"}
                </Text>
              </View>
            </View>

            {/* Card único: tabs + form + quick actions, todo junto — sin
                huecos sueltos entre bloques separados. */}
            <View
              style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}
              onLayout={(e) => setCardW(e.nativeEvent.layout.width - spacing.lg * 2 - TAB_PAD * 2)}
            >
              <View
                style={{
                  backgroundColor: P.card,
                  borderWidth: 1,
                  borderColor: P.borderSoft,
                  borderRadius: 26,
                  padding: spacing.lg,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 12 },
                  shadowRadius: 24,
                  shadowOpacity: 0.35,
                  elevation: 8,
                }}
              >
                {/* Tabs — posición fija, solo la píldora se traslada */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: P.input,
                    borderRadius: 999,
                    padding: TAB_PAD,
                    position: "relative",
                    marginBottom: spacing.lg,
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        top: TAB_PAD,
                        left: TAB_PAD,
                        bottom: TAB_PAD,
                        width: "50%",
                        backgroundColor: P.accentMid,
                        borderRadius: 999,
                      },
                      indicatorStyle,
                    ]}
                  />
                  <Pressable
                    style={{ flex: 1, paddingVertical: 11, alignItems: "center", zIndex: 1 }}
                    onPress={() => { setTab("login"); setErrorMsg(null); }}
                  >
                    <Text style={{ fontFamily: fontFamily.interBold, fontSize: 14, color: tab === "login" ? P.white : P.mutedIcon }}>
                      Iniciar Sesión
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, paddingVertical: 11, alignItems: "center", zIndex: 1 }}
                    onPress={() => { setTab("register"); setErrorMsg(null); }}
                  >
                    <Text style={{ fontFamily: fontFamily.interBold, fontSize: 14, color: tab === "register" ? P.white : P.mutedIcon }}>
                      Registrarme
                    </Text>
                  </Pressable>
                </View>

                {tab === "login" ? (
                  <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.md }}>
                    <RefInput
                      icon={<DocumentIcon />}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Nro. de Documento"
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                    <RefInput
                      icon={<LockIcon />}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Contraseña"
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
                      <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.md }}>
                        <RefInput
                          icon={<GlobeIcon />}
                          accent
                          value={foreignDoc}
                          onChangeText={setForeignDoc}
                          placeholder="Pasaporte o documento extranjero"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <RefInput
                          icon={<GlobeIcon />}
                          accent
                          value={foreignCountry}
                          onChangeText={setForeignCountry}
                          placeholder="País del documento"
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
                    />
                  </Animated.View>
                ) : (
                  <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.md }}>
                    <RefInput
                      icon={<DocumentIcon />}
                      value={regDoc}
                      onChangeText={setRegDoc}
                      placeholder="Nro. de Documento"
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                    <RefInput
                      icon={<CardIcon />}
                      value={regMatricula}
                      onChangeText={setRegMatricula}
                      placeholder="Matrícula"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleRegister}
                    />

                    {foreignOpen ? (
                      <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.md }}>
                        <RefInput
                          icon={<GlobeIcon />}
                          accent
                          value={foreignDoc}
                          onChangeText={setForeignDoc}
                          placeholder="Pasaporte o documento extranjero"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <RefInput
                          icon={<GlobeIcon />}
                          accent
                          value={foreignCountry}
                          onChangeText={setForeignCountry}
                          placeholder="País del documento"
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

                {/* Quick actions — dentro del mismo card, separadas por un
                    divisor, en grilla de 3 columnas iguales (sin huecos). */}
                <View style={{ borderTopWidth: 1, borderTopColor: P.borderSoft, marginTop: spacing.lg, paddingTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
                  <QuickTile
                    active={foreignOpen}
                    icon={<GlobeIcon />}
                    label={"Documento\nextranjero"}
                    onPress={() => setForeignOpen((v) => !v)}
                  />
                  <QuickTile
                    icon={<FingerprintIcon />}
                    label={bioType}
                    onPress={() => setBiometricOpen(true)}
                  />
                  <QuickTile
                    icon={<KeyIcon />}
                    label={"Olvidé mi\ncontraseña"}
                    onPress={() => setForgotOpen(true)}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
          <Text style={{ color: "#dff2fc", fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption, flex: 1 }}>
            {toast}
          </Text>
        </Animated.View>
      ) : null}

      <ForgotPasswordModal
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onDone={showToast}
      />

      <BiometricModal
        visible={biometricOpen}
        bioType={bioType}
        onCancel={() => setBiometricOpen(false)}
        onConfirm={executeBiometricAuth}
      />

      <ForeignDocumentModal
        visible={foreignLoginOpen}
        onClose={() => { setForeignLoginOpen(false); setForeignLoginDoc(""); setForeignLoginPw(""); }}
        onDone={showToast}
        doc={foreignLoginDoc}
        setDoc={setForeignLoginDoc}
        pw={foreignLoginPw}
        setPw={setForeignLoginPw}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ErrorText({ msg }: { msg: string }) {
  return (
    <Text style={{ color: P.error, fontFamily: fontFamily.inter, fontSize: fontSize.caption }}>
      {msg}
    </Text>
  );
}

/** Input ícono-inline, radio 16 (no píldora completa) — fiel al mockup. */
function RefInput({
  icon,
  rightAccessory,
  accent,
  ...inputProps
}: {
  icon: React.ReactNode;
  rightAccessory?: React.ReactNode;
  accent?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused || accent ? "rgba(56,189,248,0.4)" : P.border;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: P.input,
        borderWidth: 1,
        borderColor,
        borderRadius: 16,
        paddingHorizontal: spacing.md,
      }}
    >
      {icon}
      <TextInput
        placeholderTextColor={P.mutedIcon}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          color: P.white,
          fontFamily: fontFamily.interSemibold,
          fontSize: 15,
          paddingVertical: 15,
          paddingLeft: spacing.sm,
        }}
        {...inputProps}
      />
      {rightAccessory}
    </View>
  );
}

function GradientButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.9 : 1 })}>
      <LinearGradient
        colors={disabled ? ["#2a3744", "#232f3a"] : [P.accentStrong, P.accentMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: P.accentMid,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          shadowOpacity: disabled ? 0 : 0.4,
          elevation: disabled ? 0 : 6,
        }}
      >
        {loading
          ? <ActivityIndicator color={P.white} />
          : <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15.5 }}>{label}</Text>
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
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: P.input,
        borderWidth: 1,
        borderColor: active ? P.accentMid : P.border,
        borderRadius: 18,
        paddingVertical: spacing.md,
        paddingHorizontal: 4,
        alignItems: "center",
        gap: spacing.xs,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon}
      <Text style={{ color: P.mutedText, fontFamily: fontFamily.interBold, fontSize: 10.5, textAlign: "center", lineHeight: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SVG Icons — stroke muted por defecto (campos), accent en acciones rápidas
// ---------------------------------------------------------------------------
function DocumentIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke={P.mutedIcon} strokeWidth={2} />
      <Path d="M7 9h4M7 13h7" stroke={P.mutedIcon} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 10h16v10H4z" stroke={P.mutedIcon} strokeWidth={2} />
      <Path d="M8 10V7a4 4 0 018 0v3" stroke={P.mutedIcon} strokeWidth={2} />
    </Svg>
  );
}

function CardIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke={P.mutedIcon} strokeWidth={2} />
      <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke={P.mutedIcon} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke={P.accent} strokeWidth={2} />
      <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" stroke={P.accent} strokeWidth={2} />
    </Svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke={P.mutedIcon} strokeWidth={2} />
        <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={P.mutedIcon} strokeWidth={2} />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3l18 18" stroke={P.mutedIcon} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.6 5.2A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a15.6 15.6 0 01-3.4 4.3M6.5 6.6C4 8.3 2 12 2 12a15.9 15.9 0 004.2 4.8A10.6 10.6 0 0012 19c1 0 1.9-.1 2.8-.4" stroke={P.mutedIcon} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9.9 10a3 3 0 004.2 4.2" stroke={P.mutedIcon} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FingerprintIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 11a3 3 0 013 3c0 2.5-.5 4.5-1.2 6.2" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.2 20.5c.9-1.8 1.3-4 1.3-6.5a1.5 1.5 0 013 0" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6.5 18.2C7.5 16.3 8 14.3 8 12a4 4 0 017-2.6" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4.6 15A9 9 0 014 12a8 8 0 0112.6-6.5" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M19.5 9.5c.3.8.5 1.6.5 2.5 0 1.2-.1 2.3-.3 3.4" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function KeyIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M8 14a4 4 0 100-8 4 4 0 000 8z" stroke={P.accent} strokeWidth={1.8} />
      <Path d="M10.8 11.2 20 2M15 7l3 3M18 4l2 2" stroke={P.accent} strokeWidth={1.8} strokeLinecap="round" />
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

// ---------------------------------------------------------------------------
// Foreign Document Modal
// ---------------------------------------------------------------------------
function ForeignDocumentModal({
  visible,
  onClose,
  onDone,
  doc,
  setDoc,
  pw,
  setPw,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
  doc: string;
  setDoc: (v: string) => void;
  pw: string;
  setPw: (v: string) => void;
}) {
  const [sending, setSending] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleForeignLogin() {
    if (!doc.trim() || !pw) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onDone("Sesión iniciada correctamente");
      onClose();
    }, 1200);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: "100%", backgroundColor: P.card, borderRadius: 26, borderWidth: 1, borderColor: P.borderSoft, padding: spacing.xl }}
        >
          <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 24, marginBottom: spacing.xs }}>
            Documento extranjero
          </Text>
          <Text style={{ color: P.mutedText, fontFamily: fontFamily.inter, fontSize: 14, marginBottom: spacing.lg, lineHeight: 20 }}>
            Ingresá con tu pasaporte o documento de otro país.
          </Text>
          <View style={{ gap: spacing.md }}>
            <RefInput
              icon={<GlobeIcon />}
              value={doc}
              onChangeText={setDoc}
              placeholder="Pasaporte o documento"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <RefInput
              icon={<LockIcon />}
              value={pw}
              onChangeText={setPw}
              placeholder="Contraseña"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              rightAccessory={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={12} style={{ padding: 10 }}>
                  <EyeIcon open={showPw} />
                </Pressable>
              }
            />
          </View>
          <Pressable
            onPress={handleForeignLogin}
            disabled={!doc.trim() || !pw || sending}
            style={{ marginTop: spacing.xl, opacity: doc.trim() && pw && !sending ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={[P.accentStrong, P.accentMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
            >
              {sending
                ? <ActivityIndicator color={P.white} />
                : <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15.5 }}>Ingresar</Text>
              }
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BiometricModal({
  visible,
  bioType,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  bioType: BioType;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const pulseAnim = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      pulseAnim.value = withTiming(1.5, { duration: 1400, easing: Easing.out(Easing.ease) });
      pulseOpacity.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) });
    } else {
      pulseAnim.value = 1;
      pulseOpacity.value = 0.5;
    }
  }, [visible]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <View style={{ width: "100%", backgroundColor: P.card, borderRadius: 26, borderWidth: 1, borderColor: P.borderSoft, padding: spacing.xl, alignItems: "center", gap: spacing.lg }}>
          <Text style={{ color: P.mutedIcon, fontFamily: fontFamily.interBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Seguridad detectada
          </Text>

          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: "rgba(20,121,184,0.12)",
            borderWidth: 2, borderColor: "rgba(56,189,248,0.45)",
            alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <Animated.View
              style={[
                {
                  position: "absolute", inset: -4,
                  borderRadius: 52,
                  borderWidth: 2, borderColor: P.accent,
                },
                pulseRingStyle,
              ]}
            />
            <FingerprintIcon />
          </View>

          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 22, textAlign: "center" }}>
              {bioType}
            </Text>
            <Text style={{ color: P.mutedText, fontFamily: fontFamily.inter, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Mirá la pantalla o apoyá tu dedo para ingresar.
            </Text>
          </View>

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => ({ width: "100%", opacity: pressed ? 0.9 : 1 })}
          >
            <LinearGradient
              colors={[P.accentStrong, P.accentMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15.5 }}>Autenticar</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onCancel} style={({ pressed }) => ({ paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: P.mutedText, fontFamily: fontFamily.interSemibold, fontSize: 14 }}>
              Usar contraseña en su lugar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Forgot Password Modal
// ---------------------------------------------------------------------------
function ForgotPasswordModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [doc, setDoc] = useState("");
  const [matricula, setMatricula] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!doc.trim() || !matricula.trim()) return;
    setSending(true);
    try {
      const detail = await recuperarContrasenaRequest(doc.trim());
      onDone(detail);
    } catch {
      onDone(`Contactá a secretaría: ${SECRETARIA_EMAIL}`);
    } finally {
      setSending(false);
      setDoc("");
      setMatricula("");
      onClose();
    }
  }

  const canSubmit = doc.trim().length > 0 && matricula.trim().length > 0 && !sending;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: "100%", backgroundColor: P.card, borderRadius: 26, borderWidth: 1, borderColor: P.borderSoft, padding: spacing.xl }}
        >
          <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 24, marginBottom: spacing.xs }}>
            Recuperar contraseña
          </Text>
          <Text style={{ color: P.mutedText, fontFamily: fontFamily.inter, fontSize: 14, marginBottom: spacing.lg, lineHeight: 20 }}>
            Le enviaremos un correo electrónico con su nueva contraseña.
          </Text>
          <View style={{ gap: spacing.md }}>
            <RefInput
              icon={<DocumentIcon />}
              value={doc}
              onChangeText={setDoc}
              placeholder="Nro. de Documento"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <RefInput
              icon={<CardIcon />}
              value={matricula}
              onChangeText={setMatricula}
              placeholder="Matrícula"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <Pressable onPress={handleSend} disabled={!canSubmit} style={{ marginTop: spacing.xl, opacity: canSubmit ? 1 : 0.5 }}>
            <LinearGradient
              colors={[P.accentStrong, P.accentMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: spacing.md, borderRadius: 16, alignItems: "center" }}
            >
              {sending
                ? <ActivityIndicator color={P.white} />
                : <Text style={{ color: P.white, fontFamily: fontFamily.interBold, fontSize: 15.5 }}>Recuperar</Text>
              }
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
