import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { colors } from "./colors";

export { colors };

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

export const type = {
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textHeading,
    letterSpacing: -0.4,
  } as TextStyle,
  heading: { fontSize: 20, fontWeight: "700", color: colors.textHeading } as TextStyle,
  subtitle: { fontSize: 15, fontWeight: "600", color: colors.text } as TextStyle,
  body: { fontSize: 15, color: colors.text, lineHeight: 22 } as TextStyle,
  meta: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 } as TextStyle,
  caption: { fontSize: 12, color: colors.textMuted, fontWeight: "600" } as TextStyle,
};

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#13003E",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
};
