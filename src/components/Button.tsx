import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { IconName } from "../config/features";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const busy = Boolean(loading || disabled);
  const lightLabel = variant === "primary" || variant === "danger";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={[styles.base, styles[variant], busy && styles.disabled, style]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={lightLabel ? colors.white : colors.brand} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={lightLabel ? colors.white : colors.brand}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.label, lightLabel ? styles.labelLight : styles.labelDark]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    base: {
      minHeight: 48,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    primary: {
      backgroundColor: colors.brand,
    },
    secondary: {
      backgroundColor: colors.brandSoft,
    },
    ghost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    danger: {
      backgroundColor: colors.danger,
    },
    disabled: {
      opacity: 0.6,
    },
    icon: {
      marginRight: 8,
    },
    label: {
      ...type.button,
    },
    labelLight: {
      color: colors.white,
    },
    labelDark: {
      color: colors.brand,
    },
  };
}
