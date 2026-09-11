import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { IconName } from "../config/features";

type Props = {
  icon?: IconName;
  title: string;
  hint?: string;
};

export default function EmptyState({ icon = "file-tray-outline", title, hint }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    wrap: {
      alignItems: "center" as const,
      paddingHorizontal: space.xxl,
      paddingVertical: 48,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.brandSoft,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: space.md,
    },
    title: {
      ...type.subtitle,
      textAlign: "center" as const,
    },
    hint: {
      ...type.meta,
      marginTop: space.sm,
      color: colors.textMuted,
      textAlign: "center" as const,
    },
  };
}
