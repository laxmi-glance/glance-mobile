import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReportDatePicker from "./ReportDatePicker";
import { formatDate } from "../../utils/dates";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { ReportDateMode, ReportPreset, ReportRange } from "../../types/reports";

type Props = {
  mode?: ReportDateMode;
  range: ReportRange;
  presets: ReportPreset[];
  onRangeChange: (range: ReportRange) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  children?: React.ReactNode;
};

export default function ReportPeriodBar({
  mode = "range",
  range,
  presets,
  onRangeChange,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const valueLabel =
    mode === "date"
      ? `As of ${formatDate(range.endDate)}`
      : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Change report dates"
      >
        <Ionicons name="calendar-outline" size={18} color={colors.brand} />
        <View style={styles.dateText}>
          <Text style={styles.dateTitle}>{range.label}</Text>
          <Text style={styles.dateValue}>{valueLabel}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => onSearchChange("")} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
      {open ? (
        <ReportDatePicker
          mode={mode}
          presets={presets}
          initial={range}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            onRangeChange(next);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    wrap: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      gap: space.sm,
    },
    dateButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: space.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      paddingVertical: 10,
    },
    dateText: {
      flex: 1,
    },
    dateTitle: {
      ...type.label,
    },
    dateValue: {
      ...type.caption,
      marginTop: 2,
    },
    search: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: space.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      minHeight: 42,
    },
    input: {
      flex: 1,
      ...type.callout,
      paddingVertical: 8,
    },
  };
}
