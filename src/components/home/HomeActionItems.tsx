import React from "react";
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

export type HomeAction = {
  key: string;
  icon: IconName;
  title: string;
  subtitle: string;
  tone?: "brand" | "warning" | "danger";
  onPress: () => void;
};

type Props = {
  actions: HomeAction[];
};

export default function HomeActionItems({ actions }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (actions.length === 0) {
    return null;
  }

  const toneMap = {
    brand: { bg: colors.brandSoft, fg: colors.brand },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };

  return (
    <View style={styles.stack}>
      {actions.map((action) => {
        const tone = toneMap[action.tone || "brand"];
        return (
          <TouchableOpacity
            key={action.key}
            style={styles.row}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
              <Ionicons name={action.icon} size={18} color={tone.fg} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{action.title}</Text>
              <Text style={styles.subtitle}>{action.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles({ colors, type, isDark }: ThemeTokens) {
  return {
    stack: {
      gap: space.sm,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: space.lg,
      ...makeShadow(isDark),
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...type.cardTitle,
    },
    subtitle: {
      ...type.caption,
      marginTop: 2,
      color: colors.textSecondary,
    },
  };
}
