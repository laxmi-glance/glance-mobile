import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDate } from "../../utils/dates";
import { parseReportDate } from "../../utils/reportPeriod";
import { toApiDate } from "../../utils/period";
import Button from "../Button";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { ReportDateMode, ReportPreset, ReportRange } from "../../types/reports";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  mode: ReportDateMode;
  presets: ReportPreset[];
  initial: ReportRange;
  onClose: () => void;
  onApply: (range: ReportRange) => void;
};

export default function ReportDatePicker({ mode, presets, initial, onClose, onApply }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const initialDate = parseReportDate(initial.startDate) ?? new Date();
  const [start, setStart] = useState(initial.startDate);
  const [end, setEnd] = useState(initial.endDate);
  const [presetId, setPresetId] = useState(initial.id);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [cursor, setCursor] = useState({
    year: initialDate.getFullYear(),
    month: initialDate.getMonth(),
  });

  const selectPreset = (preset: ReportPreset) => {
    const nextStart = mode === "date" ? preset.endDate : preset.startDate;
    setPresetId(preset.id);
    setStart(nextStart);
    setEnd(preset.endDate);
    setAnchor(null);
    const shown = parseReportDate(nextStart);
    if (shown) {
      setCursor({ year: shown.getFullYear(), month: shown.getMonth() });
    }
  };

  const selectDay = (iso: string) => {
    setPresetId("custom");
    if (mode === "date") {
      setStart(iso);
      setEnd(iso);
      setAnchor(null);
      return;
    }
    if (!anchor) {
      setAnchor(iso);
      setStart(iso);
      setEnd(iso);
      return;
    }
    const [from, to] = anchor <= iso ? [anchor, iso] : [iso, anchor];
    setStart(from);
    setEnd(to);
    setAnchor(null);
  };

  const apply = () => {
    const preset = presets.find(
      (item) => item.id === presetId && item.startDate === start && item.endDate === end
    );
    onApply({
      id: preset?.id ?? "custom",
      label: preset?.label ?? "Custom",
      startDate: start,
      endDate: end,
    });
  };

  const weeks = monthWeeks(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{mode === "date" ? "As of date" : "Report period"}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close date picker">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.section}>Presets</Text>
          {presets.map((preset) => {
            const selected = preset.id === presetId;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.preset, selected && styles.presetSelected]}
                onPress={() => selectPreset(preset)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>
                  {preset.label}
                </Text>
                <Text style={styles.presetDates}>{presetDates(preset, mode)}</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.section}>
            {mode === "date" ? "Or pick a date" : "Or pick a start and end date"}
          </Text>
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => shiftMonth(setCursor, -1)}
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => shiftMonth(setCursor, 1)}
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekdays}>
            {WEEKDAYS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.day} />;
                }
                const iso = toApiDate(date);
                const inRange = iso >= start && iso <= end;
                const endpoint = iso === start || iso === end;
                return (
                  <TouchableOpacity
                    key={iso}
                    style={[
                      styles.day,
                      inRange && styles.dayInRange,
                      endpoint && styles.daySelected,
                    ]}
                    onPress={() => selectDay(iso)}
                    accessibilityLabel={formatDate(iso)}
                  >
                    <Text style={[styles.dayText, endpoint && styles.dayTextSelected]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <Text style={styles.draft}>
            {mode === "date"
              ? `As of ${formatDate(end)}`
              : `${formatDate(start)} – ${formatDate(end)}`}
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={onClose}
            style={styles.footerButton}
          />
          <Button label="Apply" onPress={apply} style={styles.footerButton} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function presetDates(preset: ReportPreset, mode: ReportDateMode): string {
  if (mode === "date" || preset.startDate === preset.endDate) {
    return formatDate(preset.endDate);
  }
  return `${formatDate(preset.startDate)} – ${formatDate(preset.endDate)}`;
}

function shiftMonth(
  setCursor: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>,
  delta: number
) {
  setCursor((current) => {
    const next = new Date(current.year, current.month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });
}

function monthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push(null);
  }
  for (let dayNumber = 1; dayNumber <= count; dayNumber += 1) {
    cells.push(new Date(year, month, dayNumber));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
    },
    title: {
      ...type.heading,
    },
    content: {
      paddingHorizontal: space.lg,
      paddingBottom: space.xl,
      gap: space.sm,
    },
    section: {
      ...type.overline,
      textTransform: "uppercase" as const,
      marginTop: space.sm,
    },
    preset: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: space.md,
      paddingVertical: 10,
    },
    presetSelected: {
      borderColor: colors.brand,
      backgroundColor: colors.brandSoft,
    },
    presetLabel: {
      ...type.label,
    },
    presetLabelSelected: {
      color: colors.brand,
    },
    presetDates: {
      ...type.caption,
      marginTop: 2,
    },
    monthRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: space.sm,
    },
    monthLabel: {
      ...type.subtitle,
    },
    weekdays: {
      flexDirection: "row" as const,
    },
    weekday: {
      ...type.caption,
      width: "14.28%" as const,
      textAlign: "center" as const,
    },
    week: {
      flexDirection: "row" as const,
    },
    day: {
      width: "14.28%" as const,
      aspectRatio: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: radius.full,
    },
    dayInRange: {
      backgroundColor: colors.brandSoft,
      borderRadius: 0,
    },
    daySelected: {
      backgroundColor: colors.brand,
      borderRadius: radius.full,
    },
    dayText: {
      ...type.callout,
    },
    dayTextSelected: {
      color: colors.white,
    },
    draft: {
      ...type.subtitle,
      textAlign: "center" as const,
      marginTop: space.md,
    },
    footer: {
      flexDirection: "row" as const,
      gap: space.sm,
      padding: space.lg,
    },
    footerButton: {
      flex: 1,
    },
  };
}
