import { Pressable, Text, View } from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fontFamily } from "../../constants/design";

type Props = {
  count?: number;
  onPress?: () => void;
  size?: number;
};

export function NotificationBell({ count = 0, onPress, size = 28 }: Props) {
  const shake = useSharedValue(0);
  const scale = useSharedValue(1);

  function triggerShake() {
    shake.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-3, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeCount = count > 99 ? "99+" : count > 0 ? String(count) : null;
  const badgeWidth = count > 9 ? 20 : 16;

  return (
    <Pressable
      onPress={() => {
        triggerShake();
        onPress?.();
      }}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: pressed ? colors.glassBg : "transparent",
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <View style={{ width: size + 10, height: size + 10, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={animStyle}>
          <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Path
              d="M16 3C16 3 9 7 9 16V22H23V16C23 7 16 3 16 3Z"
              fill="#FFD93D"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <Path
              d="M13 8C13 8 11 11 11 15"
              stroke="#FFE97A"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.7}
            />
            <Rect
              x="7"
              y="21"
              width="18"
              height="3"
              rx="1.5"
              fill="#FFD93D"
              stroke="#1A1A1A"
              strokeWidth="2"
            />
            <Circle
              cx="16"
              cy="27"
              r="2.2"
              fill="#FFB800"
              stroke="#1A1A1A"
              strokeWidth="2"
            />
            <Path
              d="M16 3V1.5"
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {badgeCount && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                right: 0,
                minWidth: badgeWidth,
                height: 16,
                borderRadius: 8,
                backgroundColor: "#ef4444",
                borderWidth: 1.5,
                borderColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              },
              badgeStyle,
            ]}
          >
            <Text
              style={{
                color: "#fff",
                fontFamily: fontFamily.interSemibold,
                fontSize: 9,
                lineHeight: 11,
                includeFontPadding: false,
              }}
            >
              {badgeCount}
            </Text>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}
