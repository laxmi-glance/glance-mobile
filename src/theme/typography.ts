import { type TextStyle } from "react-native";
import { lightColors, type AppColors } from "./colors";

/**
 * Urbanist — same family as glance-frontend `--gw-font-primary`.
 * Use named families (not fontWeight) so Android resolves the correct file.
 */
export const fonts = {
  regular: "Urbanist_400Regular",
  medium: "Urbanist_500Medium",
  semibold: "Urbanist_600SemiBold",
  bold: "Urbanist_700Bold",
  extrabold: "Urbanist_800ExtraBold",
} as const;

/** Glancewise type scale (web tokens, sized for phone). */
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  body: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  display: 28,
} as const;

const base: TextStyle = {
  fontFamily: fonts.regular,
};

export type TypeScale = ReturnType<typeof makeType>;

export function makeType(colors: AppColors) {
  return {
    display: {
      ...base,
      fontFamily: fonts.bold,
      fontSize: fontSize.display,
      lineHeight: 34,
      letterSpacing: -0.6,
      color: colors.textHeading,
    } as TextStyle,
    title: {
      ...base,
      fontFamily: fonts.bold,
      fontSize: fontSize.xxl,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: colors.textHeading,
    } as TextStyle,
    heading: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.lg,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textHeading,
    } as TextStyle,
    subtitle: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.body,
      lineHeight: 22,
      color: colors.text,
    } as TextStyle,
    body: {
      ...base,
      fontFamily: fonts.regular,
      fontSize: fontSize.body,
      lineHeight: 24,
      color: colors.text,
    } as TextStyle,
    bodyMedium: {
      ...base,
      fontFamily: fonts.medium,
      fontSize: fontSize.body,
      lineHeight: 24,
      color: colors.text,
    } as TextStyle,
    callout: {
      ...base,
      fontFamily: fonts.regular,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.text,
    } as TextStyle,
    calloutMedium: {
      ...base,
      fontFamily: fonts.medium,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.text,
    } as TextStyle,
    cardTitle: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.md,
      lineHeight: 20,
      color: colors.textHeading,
    } as TextStyle,
    label: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.sm,
      lineHeight: 18,
      color: colors.text,
    } as TextStyle,
    meta: {
      ...base,
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      lineHeight: 18,
      color: colors.textSecondary,
    } as TextStyle,
    caption: {
      ...base,
      fontFamily: fonts.medium,
      fontSize: fontSize.xs,
      lineHeight: 16,
      color: colors.textMuted,
    } as TextStyle,
    overline: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      color: colors.textMuted,
    } as TextStyle,
    button: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.body,
      lineHeight: 22,
    } as TextStyle,
    numeric: {
      ...base,
      fontFamily: fonts.bold,
      fontSize: fontSize.xxl,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: colors.textHeading,
    } as TextStyle,
    numericLg: {
      ...base,
      fontFamily: fonts.bold,
      fontSize: fontSize.display,
      lineHeight: 34,
      letterSpacing: -0.5,
      color: colors.textHeading,
    } as TextStyle,
    link: {
      ...base,
      fontFamily: fonts.semibold,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.interactive,
    } as TextStyle,
    input: {
      ...base,
      fontFamily: fonts.regular,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.text,
    } as TextStyle,
  };
}

/** Light-theme type scale. Prefer `useAppTheme().type` in components. */
export const type = makeType(lightColors);

export const defaultTextStyle: TextStyle = {
  fontFamily: fonts.regular,
  color: lightColors.text,
};

export const navigationFonts = {
  headerTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
  },
  tabLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    marginBottom: 2,
  } as TextStyle,
};
