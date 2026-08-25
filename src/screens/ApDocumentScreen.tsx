import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { ApDocumentScreenProps } from "../types/navigation";
import financialDocumentService from "../services/financialDocument.service";
import type { FinancialDocumentDetail } from "../types/models";
import StatusBadge from "../components/StatusBadge";
import Card from "../components/Card";
import Button from "../components/Button";
import DocumentPreview from "../components/DocumentPreview";
import RejectReasonModal from "../components/RejectReasonModal";
import { formatDate, formatDateTime } from "../utils/dates";
import { formatMoney, humanizeKey } from "../utils/money";
import { resolvePayableAmounts, type PayableAmounts } from "../utils/payableAmounts";
import { apiErrorMessage } from "../utils/errors";
import {
  approvalLabel,
  approvalTone,
  canActOnApproval,
  displayName,
  vendorName,
} from "../utils/approval";
import { useRbac } from "../hooks/useRbac";
import { colors, space } from "../theme";

export default function ApDocumentScreen({ route, navigation }: ApDocumentScreenProps) {
  const { documentId } = route.params;
  const rbac = useRbac();
  const [document, setDocument] = useState<FinancialDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const loadDocument = useCallback(
    async (goBackOnError = true) => {
      try {
        const data = await financialDocumentService.getDocument(documentId);
        setDocument(data);
      } catch (error: unknown) {
        Alert.alert("Could not load document", apiErrorMessage(error));
        if (goBackOnError) {
          navigation.goBack();
        }
      } finally {
        setLoading(false);
      }
    },
    [documentId, navigation]
  );

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const submit = async (status: "approved" | "rejected", remarks?: string) => {
    if (!document) {
      return;
    }
    setActing(true);
    try {
      await financialDocumentService.submitApproval({
        documentId: document.id,
        approvalId: document.document_approval?.id,
        status,
        userId: rbac.userId,
        remarks,
      });
      setRejectOpen(false);
      Alert.alert(status === "approved" ? "Approved" : "Rejected", "Approval status updated.");
      await loadDocument(false);
    } catch (error: unknown) {
      Alert.alert("Could not update approval", apiErrorMessage(error));
    } finally {
      setActing(false);
    }
  };

  if (loading || !document) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const currency = document.invoice_currency || "INR";
  const amounts = resolvePayableAmounts(document);
  const approval = document.document_approval;
  const actionGate = canActOnApproval(document, rbac.config, rbac.role, rbac.username);
  const netDiffers =
    amounts.netPayable != null && amounts.total != null && amounts.netPayable !== amounts.total;
  const heroAmount = netDiffers ? amounts.netPayable : amounts.total;
  const parentItems = (document.items || []).filter((item) => item.id && !item.parent_line_id);
  const documentType = humanizeKey(document.document_type);
  const invoiceDate = formatDate(document.invoice_date);
  const dueDate = formatDate(document.due_date);
  const headerMeta = [
    documentType !== "—" ? documentType : null,
    invoiceDate !== "—" ? invoiceDate : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const amountRows = amountBreakdownRows(amounts, currency, netDiffers);
  const approvalRows = [
    { label: "Requested to", value: displayName(approval?.requested_to) },
    { label: "Approved by", value: displayName(approval?.approved_by) },
    { label: "Approved at", value: formatDateTime(approval?.approved_at || document.approval_at) },
    { label: "Rejected at", value: formatDateTime(approval?.rejected_at) },
    { label: "Remarks", value: approval?.remarks || "" },
  ].filter((row) => row.value && row.value !== "—");
  const recordRows = [
    { label: "Uploaded", value: formatDateTime(document.created_on) },
    {
      label: "Uploaded by",
      value: document.created_by || document.created_by_username || "",
    },
    { label: "Validation", value: humanizeKey(document.validation_status) },
  ].filter((row) => row.value && row.value !== "—");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Text style={styles.vendor}>{vendorName(document)}</Text>
        <Text style={styles.invoice}>
          {document.invoice_number || document.file_name || "AP document"}
        </Text>
        <Text style={styles.amount}>{formatMoney(heroAmount, currency)}</Text>
        {netDiffers ? <Text style={styles.heroHint}>Net payable</Text> : null}
        {headerMeta ? <Text style={styles.metaLine}>{headerMeta}</Text> : null}
        {dueDate !== "—" ? <Text style={styles.dueLine}>Due {dueDate}</Text> : null}
        <View style={styles.badgeRow}>
          <StatusBadge
            label={approvalLabel(document.approval_status)}
            tone={approvalTone(document.approval_status)}
          />
          {document.gl_posting_status ? (
            <StatusBadge
              label={humanizeKey(document.gl_posting_status)}
              tone={document.gl_posting_status === "POSTED" ? "success" : "neutral"}
            />
          ) : null}
        </View>
      </Card>

      {document.file_url ? (
        <Card style={[styles.section, styles.previewCard]} padded={false}>
          <Text style={styles.previewTitle}>Original document</Text>
          <DocumentPreview url={document.file_url} fileName={document.file_name} />
        </Card>
      ) : null}

      {amountRows.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Amounts</Text>
          {amountRows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
        </Card>
      ) : null}

      {parentItems.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Line items</Text>
          {parentItems.map((item) => (
            <View key={item.id} style={styles.line}>
              <Text style={styles.lineDesc} numberOfLines={2}>
                {item.description || "Line"}
              </Text>
              <Text style={styles.lineAmt}>
                {formatMoney(
                  item.line_total ?? item.base_amount ?? item.amount ?? item.total,
                  currency
                )}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {approvalRows.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Approval</Text>
          {approvalRows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
        </Card>
      ) : null}

      {actionGate.canApprove ? (
        <View style={styles.actions}>
          <Button
            label="Reject"
            variant="danger"
            icon="close-outline"
            disabled={acting}
            onPress={() => setRejectOpen(true)}
            style={styles.actionBtn}
          />
          <Button
            label="Approve"
            icon="checkmark-outline"
            loading={acting}
            onPress={() => {
              Alert.alert("Approve document", "Approve this payable as per your workspace role?", [
                { text: "Cancel", style: "cancel" },
                { text: "Approve", onPress: () => void submit("approved") },
              ]);
            }}
            style={styles.actionBtn}
          />
        </View>
      ) : actionGate.reason ? (
        <Text style={styles.hint}>{actionGate.reason}</Text>
      ) : null}

      {recordRows.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Record</Text>
          {recordRows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
        </Card>
      ) : null}

      <RejectReasonModal
        visible={rejectOpen}
        loading={acting}
        onClose={() => setRejectOpen(false)}
        onSubmit={(remarks) => void submit("rejected", remarks)}
      />
    </ScrollView>
  );
}

function amountBreakdownRows(
  amounts: PayableAmounts,
  currency: string,
  netDiffers: boolean
): { label: string; value: string }[] {
  const hasTax = amounts.tax != null && amounts.tax !== 0;
  const hasTds = amounts.tds != null && amounts.tds !== 0;
  const hero = netDiffers ? amounts.netPayable : amounts.total;
  const lineDiffers = amounts.lineTotal != null && amounts.lineTotal !== hero;
  const rows: { label: string; value: string }[] = [];

  if (netDiffers) {
    rows.push({ label: "Processed total", value: formatMoney(amounts.total, currency) });
  }
  if (amounts.lineTotal != null && (lineDiffers || hasTax)) {
    rows.push({ label: "Line total", value: formatMoney(amounts.lineTotal, currency) });
  }
  if (hasTax) {
    rows.push({ label: "Tax", value: formatMoney(amounts.tax, currency) });
  }
  if (hasTds) {
    rows.push({ label: "TDS", value: formatMoney(amounts.tds, currency) });
  }
  return rows;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: space.lg,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  headerCard: {
    marginBottom: space.md,
  },
  vendor: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  invoice: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textHeading,
  },
  amount: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "700",
    color: colors.textHeading,
  },
  heroHint: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  metaLine: {
    marginTop: space.sm,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dueLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  badgeRow: {
    marginTop: space.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  section: {
    marginBottom: space.md,
  },
  previewCard: {
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textHeading,
    marginBottom: space.sm,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textHeading,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    textAlign: "right",
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineDesc: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  lineAmt: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textHeading,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.md,
    marginBottom: space.md,
  },
  actionBtn: {
    flex: 1,
  },
  hint: {
    marginTop: space.md,
    marginBottom: space.md,
    textAlign: "center",
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
