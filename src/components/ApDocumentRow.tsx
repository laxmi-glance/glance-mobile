import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "./StatusBadge";
import type { FinancialDocumentListItem } from "../types/models";
import {
  documentLifecycleLabel,
  documentLifecycleTone,
  isProcessingRow,
  uploaderName,
  vendorName,
} from "../utils/approval";
import { documentTypeLabel } from "../utils/documentType";
import { formatMoney } from "../utils/money";
import { formatDateTime } from "../utils/dates";
import { fonts, radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

const CARD_INSET = 14;

type Props = {
  item: FinancialDocumentListItem;
  onPress: () => void;
};

export default function ApDocumentRow({ item, onPress }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const processing = isProcessingRow(item);
  const title = item.invoice_number || item.file_name || "Untitled document";
  const uploader = uploaderName(item);
  const docType = documentTypeLabel(item.document_type);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={processing ? "sync-outline" : "receipt-outline"}
            size={18}
            color={colors.brand}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.amount} numberOfLines={1}>
              {processing
                ? "—"
                : formatMoney(item.total ?? item.line_total, item.invoice_currency || "INR")}
            </Text>
          </View>
          <Text style={styles.vendor} numberOfLines={1}>
            {vendorName(item)}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.chips}>
          {docType ? (
            <View style={styles.typeChip}>
              <Text style={styles.typeText} numberOfLines={1}>
                {docType}
              </Text>
            </View>
          ) : null}
          <StatusBadge
            compact
            label={documentLifecycleLabel(item)}
            tone={documentLifecycleTone(item)}
          />
        </View>
        <View style={styles.metaBlock}>
          {uploader ? (
            <>
              <Text style={styles.uploader} numberOfLines={1}>
                {uploader}
              </Text>
              <Text style={styles.metaDot}>·</Text>
            </>
          ) : null}
          <Text style={styles.date} numberOfLines={1}>
            {formatDateTime(item.created_on)}
          </Text>
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
      paddingHorizontal: CARD_INSET,
      paddingTop: 12,
      paddingBottom: 10,
      marginBottom: space.md,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.brandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: space.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.semibold,
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: -0.2,
      color: colors.textHeading,
      includeFontPadding: false,
    },
    amount: {
      flexShrink: 0,
      fontFamily: fonts.bold,
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: -0.2,
      color: colors.textHeading,
      fontVariant: ["tabular-nums"],
      includeFontPadding: false,
    },
    vendor: {
      marginTop: 2,
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 16,
      color: colors.textSecondary,
      includeFontPadding: false,
    },
    footer: {
      marginTop: 10,
      marginHorizontal: -CARD_INSET,
      paddingHorizontal: CARD_INSET,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm,
    },
    chips: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      minWidth: 0,
      gap: 6,
    },
    typeChip: {
      flexShrink: 1,
      maxWidth: 108,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeText: {
      ...type.overline,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    metaBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    uploader: {
      flexShrink: 1,
      minWidth: 0,
      fontFamily: fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.text,
      includeFontPadding: false,
    },
    metaDot: {
      flexShrink: 0,
      fontFamily: fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
      includeFontPadding: false,
    },
    date: {
      flexShrink: 0,
      fontFamily: fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
      includeFontPadding: false,
    },
  };
}
