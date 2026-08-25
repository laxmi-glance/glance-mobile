import React, { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, space } from "../theme";
import type { IconName } from "../config/features";

type Props = {
  label: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
};

export default function ListRow({ label, subtitle, icon, onPress, danger, right }: Props) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconWrap, danger && styles.iconDanger]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brand} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ??
        (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </View>
  );

  if (!onPress) {
    return <View style={styles.surface}>{content}</View>;
  }

  return (
    <TouchableOpacity style={styles.surface} onPress={onPress} activeOpacity={0.75}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    gap: space.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  danger: {
    color: colors.danger,
  },
});
