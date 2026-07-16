// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
  Link: ({ children }) => children,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useNavigation: () => ({}),
  useRoute: () => ({}),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Redirect: () => null,
}))

// Mock react-native-reanimated — Reanimated 4 ya no expone /mock clásico.
// Stub manual: exportamos no-ops para todas las APIs usadas en componentes.
// IMPORTANTE: las variables internas deben prefijarse con `mock` (regla
// de babel-plugin-jest-hoist). NO usar nombres como `React` o `RN` en
// factories porque el plugin hace static analysis.
jest.mock('react-native-reanimated', () => {
  const mockReact = require('react')
  const mockRN = require('react-native')
  const mockView = mockRN.View
  const mockText = mockRN.Text
  const mockScrollView = mockRN.ScrollView
  const mockImage = mockRN.Image
  const mockAnimatedComponent = (Component) => {
    const Wrapped = mockReact.forwardRef((props, ref) =>
      mockReact.createElement(Component, { ...props, ref })
    )
    Wrapped.displayName = `Animated(${
      Component.displayName || Component.name || 'Component'
    })`
    return Wrapped
  }
  const mockEasing = {
    linear: () => () => 0,
    ease: () => () => 0,
    in: () => () => 0,
    out: () => () => 0,
    inOut: () => () => 0,
    bezier: () => () => 0,
  }
  const makeMockLayoutAnim = () => ({
    delay: () => makeMockLayoutAnim(),
    duration: () => makeMockLayoutAnim(),
    springify: () => makeMockLayoutAnim(),
    damping: () => makeMockLayoutAnim(),
    mass: () => makeMockLayoutAnim(),
    stiffness: () => makeMockLayoutAnim(),
    overshootClamping: () => makeMockLayoutAnim(),
    restDisplacementThreshold: () => makeMockLayoutAnim(),
    restSpeedThreshold: () => makeMockLayoutAnim(),
    withInitialValues: () => makeMockLayoutAnim(),
    build: () => ({}),
  })
  const mockLayoutAnimation = makeMockLayoutAnim()
  const mockSharedValue = (v) => ({ value: v })
  const mockAnimatedStyle = (fn) => fn()
  const mockDerivedValue = (fn) => ({ value: fn() })
  const mockWithTiming = (v) => v
  const mockWithSpring = (v) => v
  const mockWithDecay = (v) => v
  const mockWithRepeat = (v) => v
  const mockCancelAnimation = () => {}
  const mockRunOnJS = (fn) => fn
  const mockRunOnUI = (fn) => fn
  const mockUseAnimatedProps = (fn) => fn()

  const mockValue = function (v) {
    this._value = v
  }
  mockValue.prototype.setValue = function (v) {
    this._value = v
  }
  mockValue.prototype.getValue = function () {
    return this._value
  }
  mockValue.prototype.interpolate = function () {
    return { _value: 0 }
  }

  return {
    __esModule: true,
    useSharedValue: mockSharedValue,
    useAnimatedStyle: mockAnimatedStyle,
    useDerivedValue: mockDerivedValue,
    useAnimatedProps: mockUseAnimatedProps,
    withTiming: mockWithTiming,
    withSpring: mockWithSpring,
    withDecay: mockWithDecay,
    withRepeat: mockWithRepeat,
    cancelAnimation: mockCancelAnimation,
    runOnJS: mockRunOnJS,
    runOnUI: mockRunOnUI,
    Easing: mockEasing,
    createAnimatedComponent: mockAnimatedComponent,
    Value: mockValue,
    View: mockView,
    Text: mockText,
    ScrollView: mockScrollView,
    Image: mockImage,
    FadeInDown: mockLayoutAnimation,
    FadeIn: mockLayoutAnimation,
    FadeOut: mockLayoutAnimation,
    FadeOutDown: mockLayoutAnimation,
    SlideInLeft: mockLayoutAnimation,
    SlideInRight: mockLayoutAnimation,
    SlideInDown: mockLayoutAnimation,
    SlideInUp: mockLayoutAnimation,
    SlideOutDown: mockLayoutAnimation,
    SlideOutUp: mockLayoutAnimation,
    Layout: mockLayoutAnimation,
    ZoomIn: mockLayoutAnimation,
    ZoomOut: mockLayoutAnimation,
    BounceIn: mockLayoutAnimation,
    BounceOut: mockLayoutAnimation,
    LightSpeedInRight: mockLayoutAnimation,
    LightSpeedOutLeft: mockLayoutAnimation,
    PinwheelIn: mockLayoutAnimation,
    PinwheelOut: mockLayoutAnimation,
    RollInLeft: mockLayoutAnimation,
    RollOutRight: mockLayoutAnimation,
    RotateInDownLeft: mockLayoutAnimation,
    RotateOutUpRight: mockLayoutAnimation,
    StretchInX: mockLayoutAnimation,
    StretchOutX: mockLayoutAnimation,
    FlipInEasyX: mockLayoutAnimation,
    FlipOutEasyX: mockLayoutAnimation,
    default: {
      call: () => {},
      createAnimatedComponent: mockAnimatedComponent,
      Value: mockValue,
      View: mockView,
      Text: mockText,
      Image: mockImage,
      ScrollView: mockScrollView,
      FadeInDown: mockLayoutAnimation,
      FadeIn: mockLayoutAnimation,
      FadeOut: mockLayoutAnimation,
      FadeOutDown: mockLayoutAnimation,
      SlideInLeft: mockLayoutAnimation,
      SlideInRight: mockLayoutAnimation,
      SlideInDown: mockLayoutAnimation,
      SlideInUp: mockLayoutAnimation,
      SlideOutDown: mockLayoutAnimation,
      SlideOutUp: mockLayoutAnimation,
      BounceIn: mockLayoutAnimation,
      BounceOut: mockLayoutAnimation,
      ZoomIn: mockLayoutAnimation,
      ZoomOut: mockLayoutAnimation,
      Layout: mockLayoutAnimation,
      useSharedValue: mockSharedValue,
      useAnimatedStyle: mockAnimatedStyle,
      useDerivedValue: mockDerivedValue,
      withTiming: mockWithTiming,
      withSpring: mockWithSpring,
      withDecay: mockWithDecay,
      withRepeat: mockWithRepeat,
      cancelAnimation: mockCancelAnimation,
      runOnJS: mockRunOnJS,
      runOnUI: mockRunOnUI,
      Easing: mockEasing,
    },
  }
})

// Mock react-native-worklets (peer de reanimated 4)
jest.mock('react-native-worklets', () => ({
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  createWorkletRuntime: () => ({}),
}))

// Mock react-native-svg — versión mínima para componentes que importan
// Svg/Circle/G/etc. y luego usan createAnimatedComponent sobre ellos.
jest.mock('react-native-svg', () => {
  const mockReact = require('react')
  const mockRN = require('react-native')
  const mockTag = (name) => {
    const Comp = mockReact.forwardRef((props, ref) =>
      mockReact.createElement(name, { ...props, ref })
    )
    Comp.displayName = name
    return Comp
  }
  return {
    __esModule: true,
    default: mockTag('Svg'),
    Svg: mockTag('Svg'),
    Circle: mockTag('Circle'),
    G: mockTag('G'),
    Path: mockTag('Path'),
    Rect: mockTag('Rect'),
    Line: mockTag('Line'),
    Polyline: mockTag('Polyline'),
    Polygon: mockTag('Polygon'),
    Text: mockTag('SvgText'),
    TSpan: mockTag('TSpan'),
    Defs: mockTag('Defs'),
    LinearGradient: mockTag('LinearGradient'),
    Stop: mockTag('Stop'),
    ClipPath: mockTag('ClipPath'),
    Use: mockTag('Use'),
    View: mockRN.View,
  }
})

// Mock react-native-css-interop (NativeWind v4) — no-op en tests
// IMPORTANT: react-native-css-interop's babel plugin replaces React.createElement
// with ReactNativeCSSInterop.createInteropElement in ALL files outside react/*
// and react-native/* directories. So createInteropElement MUST forward to
// React.createElement to keep View/Text/ScrollView rendering their children.
// https://github.com/nativewind/react-native-css-interop/blob/main/packages/babel-plugin/src/index.ts
jest.mock('react-native-css-interop', () => {
  const mockReact = require('react')
  const mockStyled = (Component) => {
    const Wrapped = mockReact.forwardRef((props, ref) =>
      mockReact.createElement(Component, { ...props, ref })
    )
    Wrapped.displayName = `styled(${
      Component.displayName || Component.name || 'Component'
    })`
    return Wrapped
  }
  return {
    __esModule: true,
    cssInterop: (Component) => Component,
    createInteropElement: (type, props, ...args) => {
      return mockReact.createElement(type, props, ...args)
    },
    remapProps: () => {},
    useColorScheme: () => ({ colorScheme: 'dark' }),
    useCSSVariable: () => undefined,
    styled: mockStyled,
    getDefaultStyle: () => ({}),
  }
})

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [
    { granted: false, canAskAgain: true },
    jest.fn(),
  ],
}))

// Mock expo-blur
jest.mock('expo-blur', () => {
  const mockReact = require('react')
  const mockRN = require('react-native')
  const BlurView = mockReact.forwardRef(({ children, ...props }, ref) =>
    mockReact.createElement(mockRN.View, { ...props, ref }, children)
  )
  BlurView.displayName = 'BlurView'
  return { BlurView }
})

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  authenticate: jest.fn(),
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([]),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}))

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

// window.dispatchEvent is needed by React 19's error reporting and
// some css-interop modules. Node doesn't have it, so we mock it.
if (typeof global.dispatchEvent !== 'function') {
  global.dispatchEvent = jest.fn()
}

// Global fetch noop
global.fetch = jest.fn()
