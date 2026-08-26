import React, { type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { radius, space, useThemedStyles, type ThemeTokens } from "../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export default function Card({ children, style, padded = true }: Props) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

function createStyles({ colors, isDark }: ThemeTokens) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: isDark ? "#000000" : "#13003E",
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: isDark ? 4 : 2,
    },
    padded: {
      padding: space.lg,
    },
  };
}
