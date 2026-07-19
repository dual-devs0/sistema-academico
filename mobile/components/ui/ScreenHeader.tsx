import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { useState } from "react";
import { Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import { NotificationsSheet } from "./NotificationsSheet";
import { useNotifications } from "../../hooks/useNotifications";
import { fontFamily, fontSize, radius, spacing } from "../../constants/design";

function BackArrow() {
  const { colors } = useTheme();

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={colors.textPrimary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface Props {
  greeting?: string;
  name?: string;
  fotoUrl?: string;
  avatarInitials?: string;
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onBellPress?: () => void;
  hideBell?: boolean;
  hideAvatar?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  greeting = "ESTUDIANTE",
  name,
  fotoUrl,
  avatarInitials,
  title,
  showBack,
  onBackPress,
  onBellPress,
  hideBell,
  hideAvatar,
  right,
  style,
}: Props) {
  const { colors } = useTheme();
const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();

  if (right) {
  const { colors } = useTheme();
    return (
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            gap: spacing.md,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
          {showBack ? (
            <Pressable
              onPress={onBackPress}
              hitSlop={16}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.glassBg,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <BackArrow />
            </Pressable>
          ) : hideAvatar ? null : (
            <UserAvatar
              nombre={name ?? avatarInitials}
              fotoUrl={fotoUrl}
              size={36}
              borderWidth={1.5}
              onPress={() => router.push("/(tabs)/perfil")}
            />
          )}
          <View style={{ flex: 1 }}>
            {title ? (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.headlineLg,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              <>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: fontSize.caption,
                    letterSpacing: 1.5,
                  }}
                  numberOfLines={1}
                >
                  {greeting}
                </Text>
                {name ? (
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: fontSize.body,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>
        {right}
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            gap: spacing.md,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
          {showBack ? (
            <Pressable
              onPress={onBackPress}
              hitSlop={16}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.glassBg,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <BackArrow />
            </Pressable>
          ) : hideAvatar ? null : (
            <UserAvatar
              nombre={name ?? avatarInitials}
              fotoUrl={fotoUrl}
              size={36}
              borderWidth={1.5}
              onPress={() => router.push("/(tabs)/perfil")}
            />
          )}
          <View style={{ flex: 1 }}>
            {title ? (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.headlineLg,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              <>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: fontSize.caption,
                    letterSpacing: 1.5,
                  }}
                  numberOfLines={1}
                >
                  {greeting}
                </Text>
                {name ? (
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: fontSize.body,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        {hideBell ? null : onBellPress ? (
          <Pressable
            onPress={onBellPress}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>🔔</Text>
          </Pressable>
        ) : (
          <NotificationBell
            count={unreadCount}
            onPress={() => setSheetOpen(true)}
          />
        )}
      </View>

      <NotificationsSheet
        visible={sheetOpen}
        notifications={notifications}
        onClose={() => setSheetOpen(false)}
        onMarkAllRead={() => {
          markAllRead();
          setSheetOpen(false);
        }}
      />
    </>
  );
}
