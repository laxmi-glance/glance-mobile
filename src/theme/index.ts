import { colors, lightColors, darkColors, type AppColors } from "./colors";
import {
  type,
  fonts,
  fontSize,
  defaultTextStyle,
  navigationFonts,
  makeType,
  type TypeScale,
} from "./typography";
import { ThemeProvider, useAppTheme, THEME_AUTO, THEME_DARK, THEME_LIGHT } from "./ThemeContext";
import { useThemedStyles, space, radius, shadow, makeShadow, type ThemeTokens } from "./styles";

export { colors, lightColors, darkColors };
export type { AppColors };
export { type, fonts, fontSize, defaultTextStyle, navigationFonts, makeType };
export type { TypeScale };
export { ThemeProvider, useAppTheme, THEME_AUTO, THEME_DARK, THEME_LIGHT };
export { useThemedStyles, space, radius, shadow, makeShadow };
export type { ThemeTokens };
export type { ThemeMode, ResolvedTheme } from "./ThemeContext";
