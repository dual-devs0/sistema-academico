module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|react-native-safe-area-context))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^test-renderer$': 'react-test-renderer',
  },
}
