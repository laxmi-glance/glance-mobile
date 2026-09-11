import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  THEME_AUTO,
  THEME_DARK,
  THEME_LIGHT,
  radius,
  space,
  useAppTheme,
  useThemedStyles,
  type ThemeMode,
  type ThemeTokens,
} from "../theme";
import type { IconName } from "../config/features";

const OPTIONS: { key: ThemeMode; label: string; icon: IconName }[] = [
  { key: THEME_LIGHT, label: "Light", icon: "sunny-outline" },
  { key: THEME_DARK, label: "Dark", icon: "moon-outline" },
  { key: THEME_AUTO, label: "System", icon: "phone-portrait-outline" },
];

export default function ThemePicker() {
  const { mode, setTheme, colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel="Appearance">
      {OPTIONS.map((option) => {
        const active = mode === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => {
              void setTheme(option.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            activeOpacity={0.85}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={active ? colors.brand : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    wrap: {
      flexDirection: "row" as const,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
      marginBottom: space.md,
    },
    option: {
      flex: 1,
      minHeight: 40,
      borderRadius: radius.sm,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
    },
    optionActive: {
      backgroundColor: colors.surface,
    },
    label: {
      ...type.caption,
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.textHeading,
    },
  };
}
