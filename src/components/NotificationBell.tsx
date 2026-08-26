import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

type Props = {
  onPress: () => void;
};

export default function NotificationBell({ onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const unread = useUnreadCount();
  const label = unread > 99 ? "99+" : String(unread);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      style={styles.hit}
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={24} color={colors.textHeading} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    hit: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      ...type.overline,
      color: colors.white,
      fontSize: 9,
      lineHeight: 11,
      letterSpacing: 0,
    },
  };
}
