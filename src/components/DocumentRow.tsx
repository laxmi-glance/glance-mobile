import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "./StatusBadge";
import { formatDateTime } from "../utils/dates";
import { statusTone } from "../utils/documentStatus";
import type { PreprocessingDocument } from "../types/models";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

type Props = {
  item: PreprocessingDocument;
  onPress: () => void;
};

export default function DocumentRow({ item, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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

function createStyles({ colors, type }: ThemeTokens) {
  return {
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
      ...type.subtitle,
      flex: 1,
    },
    meta: {
      ...type.meta,
    },
  };
}
