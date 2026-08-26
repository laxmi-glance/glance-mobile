import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { DocumentDetailScreenProps } from "../types/navigation";
import documentService from "../services/document.service";
import type { PreprocessingDocument } from "../types/models";
import StatusBadge from "../components/StatusBadge";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDateTime, formatDurationSeconds } from "../utils/dates";
import { canRetry, statusTone } from "../utils/documentStatus";
import { apiErrorMessage } from "../utils/errors";
import { colors, space } from "../theme";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";

export default function DocumentDetailScreen({ route, navigation }: DocumentDetailScreenProps) {
  const { documentId } = route.params;
  const [document, setDocument] = useState<PreprocessingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadDocument = useCallback(
    async (goBackOnError = true) => {
      try {
        const data = await documentService.getDocumentDetail(documentId);
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

  const handleRetry = () => {
    if (!document) {
      return;
    }
    Alert.alert("Retry processing", "Queue this document to run through OCR again?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Retry",
        onPress: async () => {
          setRetrying(true);
          try {
            const result = await documentService.retryDocument(document.id);
            Alert.alert("Queued", result.message || "Document queued for reprocessing.");
            await loadDocument(false);
          } catch (error: unknown) {
            Alert.alert("Retry failed", apiErrorMessage(error));
          } finally {
            setRetrying(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen edges={["bottom"]}>
        <PageHeader
          title="Processing"
          subtitle="Document status"
          icon="sync-outline"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (!document) {
    return null;
  }

  const issueText = document.exception_log || document.error_log;
  const processedDocumentId = document.financial_document?.id;

  return (
    <Screen edges={["bottom"]}>
      <PageHeader
        title="Processing"
        subtitle={document.file_name || "Document status"}
        icon="sync-outline"
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
          <Text style={styles.fileName}>{document.file_name}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={document.processing_status_display} tone={statusTone(document)} />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <InfoRow label="Type" value={document.document_type || "—"} />
          <InfoRow label="Uploaded" value={formatDateTime(document.created_on)} />
          <InfoRow label="Uploaded by" value={document.created_by || "—"} />
          <InfoRow label="Started" value={formatDateTime(document.processing_started_at)} />
          <InfoRow label="Validation" value={document.validation_status || "—"} />
          <InfoRow label="Failures" value={String(document.failure_count ?? 0)} />
          <InfoRow label="OCR time" value={formatDurationSeconds(document.ocr_duration_seconds)} />
          <InfoRow
            label="Total time"
            value={formatDurationSeconds(document.total_processing_duration_seconds)}
          />
        </Card>

        {document.financial_document ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Linked invoice</Text>
            <InfoRow label="Number" value={document.financial_document.invoice_number || "—"} />
            <InfoRow label="Date" value={document.financial_document.invoice_date || "—"} />
            <InfoRow
              label="Total"
              value={
                document.financial_document.total != null
                  ? String(document.financial_document.total)
                  : "—"
              }
            />
            <InfoRow label="Approval" value={document.financial_document.approval_status || "—"} />
          </Card>
        ) : null}

        {document.duplicate_of ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Duplicate of</Text>
            <InfoRow label="File" value={document.duplicate_of.file_name || "—"} />
            <InfoRow label="Invoice" value={document.duplicate_of.invoice_number || "—"} />
          </Card>
        ) : null}

        {issueText ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Issue</Text>
            <Text style={styles.issue}>{issueText}</Text>
          </Card>
        ) : null}

        {processedDocumentId ? (
          <Button
            label="View details"
            variant="secondary"
            icon="receipt-outline"
            onPress={() => navigation.navigate("ApDocument", { documentId: processedDocumentId })}
            style={styles.action}
          />
        ) : null}

        {canRetry(document) ? (
          <Button
            label="Retry processing"
            icon="refresh-outline"
            onPress={handleRetry}
            loading={retrying}
            style={styles.action}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
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
  fileName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textHeading,
  },
  badgeRow: {
    marginTop: space.md,
    flexDirection: "row",
  },
  section: {
    marginBottom: space.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textHeading,
    marginBottom: space.sm,
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
  issue: {
    fontSize: 14,
    color: colors.danger,
    lineHeight: 20,
  },
  action: {
    marginTop: space.sm,
  },
});
