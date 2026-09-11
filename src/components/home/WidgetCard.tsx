import React, { type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  makeShadow,
  radius,
  space,
  useAppTheme,
  useThemedStyles,
  type ThemeTokens,
} from "../../theme";
import type { IconName } from "../../config/features";

type Props = {
  title: string;
  icon?: IconName;
  extra?: ReactNode;
  children: ReactNode;
  onPress?: () => void;
};

export default function WidgetCard({ title, icon, extra, children, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={16} color={colors.brand} />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {extra}
      </View>
      {children}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

export function WidgetEmpty({ text }: { text: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.empty}>{text}</Text>;
}

export function WidgetSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.skelTitle} />
      <View style={styles.skelValue} />
      <View style={styles.skelMeta} />
    </View>
  );
}

function createStyles({ colors, type, isDark }: ThemeTokens) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      ...makeShadow(isDark),
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: space.md,
      gap: space.sm,
    },
    titleRow: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      minWidth: 0,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.brandSoft,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: {
      ...type.cardTitle,
      flex: 1,
    },
    empty: {
      ...type.meta,
      color: colors.textMuted,
    },
    skelTitle: {
      width: "42%" as const,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.brandSoft,
      marginBottom: 16,
    },
    skelValue: {
      width: "58%" as const,
      height: 22,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 10,
    },
    skelMeta: {
      width: "34%" as const,
      height: 10,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
    },
  };
}
