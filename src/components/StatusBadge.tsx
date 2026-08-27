import React from "react";
import { View, Text } from "react-native";
import { statusColor, type StatusTone } from "../utils/documentStatus";
import { radius, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

interface Props {
  label: string;
  tone: StatusTone;
  compact?: boolean;
}

export default function StatusBadge({ label, tone, compact }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const color = statusColor(tone, colors);
  return (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        { backgroundColor: `${color}18`, borderColor: `${color}44` },
      ]}
    >
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles({ type }: ThemeTokens) {
  return {
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      maxWidth: 148,
    },
    compact: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.full,
      maxWidth: 112,
    },
    text: {
      ...type.overline,
      letterSpacing: 0.2,
    },
  };
}
