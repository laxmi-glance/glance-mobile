import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "./StatusBadge";
import { formatDateTime } from "../utils/dates";
import { statusTone } from "../utils/documentStatus";
import type { PreprocessingDocument } from "../types/models";
import { colors, radius, space } from "../theme";

type Props = {
  item: PreprocessingDocument;
  onPress: () => void;
};

export default function DocumentRow({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Ionicons name="document-text-outline" size={20} color={colors.brand} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.file_name}
          </Text>
          <StatusBadge label={item.processing_status_display} tone={statusTone(item)} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.document_type ? `${item.document_type} · ` : ""}
          {formatDateTime(item.created_on)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.sm,
    marginBottom: 6,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
