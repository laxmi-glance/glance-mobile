export type ThemeName = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'auto';

export const typography = {
  fontFamilyPrimary: 'Urbanist',
  size: {
    xs: 12,
    sm: 13,
    small: 14,
    md: 15,
    body: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 30,
    '5xl': 36,
  },
  weight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    body: 1.63,
    heading: 1.4,
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  pill: 999,
};

export const elevation = {
  card: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  floating: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
};

export const lightColors = {
  primary: '#4A4E8A',
  primaryAccent: '#3b82f6',
  primaryAccentHover: '#2563eb',
  primaryAccentActive: '#1d4ed8',
  secondary: '#667eea',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#f9f9f9',
  surfaceMuted: '#f5f5f5',
  border: '#e0e0e0',
  borderStrong: '#d1d5db',
  textPrimary: '#111827',
  textSecondary: '#1f2937',
  textEmphasis: '#111827',
  textMuted: 'rgba(0, 0, 0, 0.45)',
  link: '#3366cc',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  statusApprovedBg: '#e1ffed',
  statusApprovedText: '#03ae23',
  statusPendingBg: '#fffbe6',
  statusPendingText: '#d48806',
  statusRejectedBg: '#fff2f0',
  statusRejectedText: '#cf1322',
  statusProcessingBg: '#e6f4ff',
  statusProcessingText: '#096dd9',
  statusNeutralBg: '#f0f0f0',
  statusNeutralText: '#595959',
  overlay: 'rgba(0,0,0,0.45)',
  onPrimary: '#ffffff',
};

export const darkColors = {
  primary: '#7c7fff',
  primaryAccent: '#818cf8',
  primaryAccentHover: '#6366f1',
  primaryAccentActive: '#4f46e5',
  secondary: '#a5b4fc',
  background: '#0f1117',
  surface: '#1a1d27',
  surfaceElevated: '#1e2130',
  surfaceMuted: '#1e2130',
  border: '#2c3044',
  borderStrong: '#3a4058',
  textPrimary: '#d4d9e4',
  textSecondary: '#cbd5e1',
  textEmphasis: '#e2e8f0',
  textMuted: '#94a3b8',
  link: '#94b7ff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  statusApprovedBg: '#0a1f0f',
  statusApprovedText: '#86efac',
  statusPendingBg: '#2a1f0d',
  statusPendingText: '#fcd34d',
  statusRejectedBg: '#2a1a18',
  statusRejectedText: '#fda4af',
  statusProcessingBg: '#131a2e',
  statusProcessingText: '#93c5fd',
  statusNeutralBg: '#252a3d',
  statusNeutralText: '#94a3b8',
  overlay: 'rgba(0,0,0,0.65)',
  onPrimary: '#ffffff',
};

export const tokens = {
  typography,
  spacing,
  radius,
  elevation,
  colors: {
    light: lightColors,
    dark: darkColors,
  },
};

export type AppColors = typeof lightColors;

export interface AppTheme {
  name: ThemeName;
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  typography: typeof typography;
  button: {
    height: number;
    radius: number;
    fontSize: number;
    fontWeight: typeof typography.weight.medium;
    horizontalPadding: number;
  };
}

export const lightTheme: AppTheme = {
  name: 'light',
  colors: lightColors,
  spacing,
  radius,
  elevation,
  typography,
  button: {
    height: 36,
    radius: radius.xs,
    fontSize: 15,
    fontWeight: typography.weight.medium,
    horizontalPadding: spacing[4],
  },
};

export const darkTheme: AppTheme = {
  name: 'dark',
  colors: darkColors,
  spacing,
  radius,
  elevation,
  typography,
  button: {
    height: 36,
    radius: radius.xs,
    fontSize: 15,
    fontWeight: typography.weight.medium,
    horizontalPadding: spacing[4],
  },
};
