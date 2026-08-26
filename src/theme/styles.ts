import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { useMemo } from "react";
import { lightColors, type AppColors } from "./colors";
import { makeType, type TypeScale } from "./typography";
import { useAppTheme, type ThemeMode, type ResolvedTheme } from "./ThemeContext";

export type ThemeTokens = {
  colors: AppColors;
  type: TypeScale;
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
};

export function makeShadow(isDark: boolean): ViewStyle {
  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: isDark ? "#000000" : "#13003E",
        shadowOpacity: isDark ? 0.4 : 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: isDark ? 4 : 2,
      },
      default: {},
    }) || {}
  );
}

export function useThemedStyles(factory: (tokens: ThemeTokens) => Record<string, unknown>) {
  const { colors, type, mode, resolvedTheme, isDark } = useAppTheme();
  return useMemo(() => {
    return StyleSheet.create(
      factory({ colors, type, mode, resolvedTheme, isDark }) as {
        [key: string]: object;
      }
    ) as Record<string, object>;
  }, [colors, type, mode, resolvedTheme, isDark, factory]);
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const shadow = {
  card: makeShadow(false),
};

const lightType = makeType(lightColors);

/** Static light tokens for files that have not been converted yet. */
export const fallbackTokens: ThemeTokens = {
  colors: lightColors,
  type: lightType,
  mode: "light",
  resolvedTheme: "light",
  isDark: false,
};
