import { useTheme } from "../../hooks/useTheme";
import { Pressable, View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { fontFamily } from "../../constants/design";

function BellIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a6 6 0 00-6 6v3.5c0 .9-.36 1.77-1 2.4L4 15h16l-1-1.1a3.4 3.4 0 01-1-2.4V8a6 6 0 00-6-6z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M9.5 18a2.5 2.5 0 005 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

type Props = {
  count?: number;
  onPress?: () => void;
  size?: number;
};

export function NotificationBell({ count = 0, onPress, size = 22 }: Props) {
  const { colors } = useTheme();
  const rotate = useSharedValue(0);
  const ring1Scale = useSharedValue(0.4);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.4);
  const ring2Opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    rotate.value = withSequence(
      withTiming(-18, { duration: 80, easing: Easing.out(Easing.ease) }),
      withTiming(14, { duration: 90 }),
      withTiming(-10, { duration: 90 }),
      withTiming(6, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );

    ring1Scale.value = 0.4;
    ring1Opacity.value = 0.6;
    ring1Scale.value = withTiming(1.8, { duration: 550, easing: Easing.out(Easing.ease) });
    ring1Opacity.value = withTiming(0, { duration: 550 });

    ring2Scale.value = 0.4;
    ring2Opacity.value = 0.5;
    ring2Scale.value = withTiming(1.7, { duration: 550, easing: Easing.out(Easing.ease) });
    ring2Opacity.value = withTiming(0, { duration: 550 });

    onPress?.();
  };

  const badgeCount = count > 99 ? "99+" : count > 0 ? String(count) : null;
  const badgeWidth = count > 9 ? 20 : 16;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
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
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: colors.cyan,
            },
            ring1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: colors.cyan,
            },
            ring2Style,
          ]}
        />
        <Animated.View style={bellStyle}>
          <BellIcon color={colors.textPrimary} size={size} />
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
