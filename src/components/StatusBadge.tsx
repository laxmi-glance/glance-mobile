import React from "react";
import { View, Text } from "react-native";
import { statusColor, type StatusTone } from "../utils/documentStatus";
import { radius, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

interface Props {
  label: string;
  tone: StatusTone;
}

export default function StatusBadge({ label, tone }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const color = statusColor(tone, colors);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      maxWidth: 148,
    },
    text: {
      ...type.overline,
      letterSpacing: 0.2,
    },
  };
}
