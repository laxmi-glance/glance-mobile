import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { statusColor, type StatusTone } from "../utils/documentStatus";
import { radius } from "../theme";

interface Props {
  label: string;
  tone: StatusTone;
}

export default function StatusBadge({ label, tone }: Props) {
  const color = statusColor(tone);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    maxWidth: 148,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
