/** Glancewise color palettes — light matches current mobile tokens; dark matches web `data-theme="dark"`. */

export type AppColors = {
  brand: string;
  brandHover: string;
  brandActive: string;
  brandNavy: string;
  brandSoft: string;
  interactive: string;
  interactiveHover: string;
  accent: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  header: string;
  text: string;
  textHeading: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;
  textOnDark: string;
  textOnDarkMuted: string;
  border: string;
  borderStrong: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  processing: string;
  processingSoft: string;
  queued: string;
  overlay: string;
  white: string;
};

export const lightColors: AppColors = {
  brand: "#4A4E8A",
  brandHover: "#3a3e70",
  brandActive: "#2e3260",
  brandNavy: "#13003E",
  brandSoft: "#EEF0F8",
  interactive: "#3B82F6",
  interactiveHover: "#2563EB",
  accent: "#667EEA",
  background: "#F4F5F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F8F9FC",
  header: "#1C1C1E",
  text: "#111827",
  textHeading: "#020617",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textPlaceholder: "#9CA3AF",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "rgba(255,255,255,0.72)",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#16A34A",
  successSoft: "#F0FDF4",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  processing: "#2563EB",
  processingSoft: "#EFF6FF",
  queued: "#D97706",
  overlay: "rgba(244, 245, 249, 0.88)",
  white: "#FFFFFF",
};

export const darkColors: AppColors = {
  brand: "#7C7FFF",
  brandHover: "#5B5EC8",
  brandActive: "#4F46E5",
  brandNavy: "#13003E",
  brandSoft: "#252A3D",
  interactive: "#60A5FA",
  interactiveHover: "#38BDF8",
  accent: "#818CF8",
  background: "#0F1117",
  surface: "#1A1D27",
  surfaceMuted: "#1E2130",
  header: "#14161D",
  text: "#D4D9E4",
  textHeading: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#94A3B8",
  textPlaceholder: "#64748B",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "rgba(255,255,255,0.72)",
  border: "#2C3044",
  borderStrong: "#3A4058",
  danger: "#F87171",
  dangerSoft: "#3F1D24",
  success: "#86EFAC",
  successSoft: "#16351F",
  warning: "#FCD34D",
  warningSoft: "#3D2E12",
  processing: "#60A5FA",
  processingSoft: "#1A1F33",
  queued: "#FCD34D",
  overlay: "rgba(15, 17, 23, 0.88)",
  white: "#FFFFFF",
};

/** @deprecated Import useAppTheme().colors — kept as the light default for static callers. */
export const colors = lightColors;
