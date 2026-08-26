import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Alert } from "react-native";
import { ApDocumentScreenProps } from "../types/navigation";
import financialDocumentService from "../services/financialDocument.service";
import type { FinancialDocumentDetail } from "../types/models";
import StatusBadge from "../components/StatusBadge";
import Card from "../components/Card";
import DocumentPreview from "../components/DocumentPreview";
import RejectReasonModal from "../components/RejectReasonModal";
import ApprovalActions from "../components/ApprovalActions";
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
import { space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";

export default function ApDocumentScreen({ route, navigation }: ApDocumentScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { documentId } = route.params;
  const rbac = useRbac();
  const [document, setDocument] = useState<FinancialDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<"approved" | "rejected" | null>(null);
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
    setActingOn(status);
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
      setActingOn(null);
    }
  };

  if (loading || !document) {
    return (
      <Screen edges={["bottom"]}>
        <PageHeader
          title="Document"
          subtitle="Payable details"
          icon="receipt-outline"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
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
    <Screen edges={["bottom"]}>
      <PageHeader
        title={vendorName(document)}
        subtitle={document.invoice_number || document.file_name || "AP document"}
        icon="receipt-outline"
        showBack
        onBack={() => navigation.goBack()}
        menuActions={[
          {
            key: "refresh",
            label: "Refresh",
            onPress: () => void loadDocument(false),
          },
        ]}
      />
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

        <ApprovalActions
          canApprove={actionGate.canApprove}
          canReject={actionGate.canReject}
          actingOn={actingOn}
          onReject={() => setRejectOpen(true)}
          onApprove={() => {
            const reversing = document.approval_status === "rejected";
            Alert.alert(
              reversing ? "Approve rejected document" : "Approve document",
              reversing
                ? "This payable was rejected. Approve it now?"
                : "Approve this payable as per your workspace role?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Approve", onPress: () => void submit("approved") },
              ]
            );
          }}
        />
        {actionGate.reason && !actionGate.canApprove && !actionGate.canReject ? (
          <Text style={styles.hint}>{actionGate.reason}</Text>
        ) : null}

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
          loading={actingOn === "rejected"}
          title={
            document.approval_status === "approved" ? "Reject approved document" : "Reject document"
          }
          lead={
            document.approval_status === "approved"
              ? "This payable is approved. Add a reason to reject it."
              : "A reason is required so the submitter knows what to fix."
          }
          onClose={() => setRejectOpen(false)}
          onSubmit={(remarks) => void submit("rejected", remarks)}
        />
      </ScrollView>
    </Screen>
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
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
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
      ...type.overline,
      color: colors.brand,
      textTransform: "uppercase",
    },
    invoice: {
      ...type.title,
      marginTop: 6,
      fontSize: 20,
      lineHeight: 26,
    },
    amount: {
      ...type.numericLg,
      marginTop: 10,
    },
    heroHint: {
      ...type.label,
      marginTop: 2,
      color: colors.textSecondary,
    },
    metaLine: {
      ...type.callout,
      marginTop: space.sm,
      color: colors.textSecondary,
    },
    dueLine: {
      ...type.label,
      marginTop: 4,
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
      ...type.subtitle,
      color: colors.textHeading,
      marginBottom: space.sm,
    },
    previewTitle: {
      ...type.subtitle,
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
      ...type.callout,
      color: colors.textSecondary,
    },
    value: {
      ...type.calloutMedium,
      flex: 1,
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
      ...type.callout,
      flex: 1,
    },
    lineAmt: {
      ...type.calloutMedium,
      color: colors.textHeading,
    },
    hint: {
      ...type.meta,
      marginTop: space.md,
      marginBottom: space.md,
      textAlign: "center",
    },
  };
}
