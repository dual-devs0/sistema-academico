const React = require('react')

const defaultInsets = { top: 0, left: 0, right: 0, bottom: 0 }
const defaultFrame = { x: 0, y: 0, width: 390, height: 844 }

// Render children directly without wrapping in View.
// react-native's View is unreliable in test environments.
const SafeAreaProvider = ({ children }) => children

const SafeAreaView = ({ children }) => children

const SafeAreaConsumer = ({ children }) => children(defaultInsets)

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaConsumer,
  SafeAreaInsetsContext: React.createContext(defaultInsets),
  SafeAreaFrameContext: React.createContext(defaultFrame),
  useSafeAreaInsets: () => defaultInsets,
  useSafeAreaFrame: () => defaultFrame,
  initialWindowMetrics: { frame: defaultFrame, insets: defaultInsets },
  initialWindowSafeAreaInsets: defaultInsets,
}
