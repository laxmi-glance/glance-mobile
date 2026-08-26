import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "./StatusBadge";
import type { FinancialDocumentListItem } from "../types/models";
import { approvalLabel, approvalTone, isProcessingRow, vendorName } from "../utils/approval";
import { formatMoney } from "../utils/money";
import { formatDateTime } from "../utils/dates";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

type Props = {
  item: FinancialDocumentListItem;
  onPress: () => void;
};

export default function ApDocumentRow({ item, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const processing = isProcessingRow(item);
  const title = item.invoice_number || item.file_name || "Untitled document";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={processing ? "sync-outline" : "receipt-outline"}
          size={20}
          color={colors.brand}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {processing ? (
            <StatusBadge label={item.status || "Processing"} tone="processing" />
          ) : (
            <StatusBadge
              label={approvalLabel(item.approval_status)}
              tone={approvalTone(item.approval_status)}
            />
          )}
        </View>
        <Text style={styles.vendor} numberOfLines={1}>
          {vendorName(item)}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.amount}>
            {processing
              ? "Processing"
              : formatMoney(item.total ?? item.line_total, item.invoice_currency || "INR")}
          </Text>
          <Text style={styles.meta}>{formatDateTime(item.created_on)}</Text>
        </View>
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
      marginBottom: 4,
    },
    title: {
      ...type.subtitle,
      flex: 1,
    },
    vendor: {
      ...type.callout,
      color: colors.textSecondary,
    },
    footer: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    amount: {
      ...type.subtitle,
      color: colors.textHeading,
    },
    meta: {
      ...type.caption,
    },
  };
}
