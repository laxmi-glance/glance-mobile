import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { DocumentDetailScreenProps } from '../types/navigation';
import documentService from '../services/document.service';
import StatusBadge from '../components/dashboard/StatusBadge';
import { useTheme } from '../theme';

export default function DocumentDetailScreen({ route, navigation }: DocumentDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { documentId } = route.params;
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocumentDetail();
  }, [documentId]);

  const loadDocumentDetail = async () => {
    try {
      const data = await documentService.getDocumentDetail(documentId);
      setDetail(data);
    } catch {
      Alert.alert('Error', 'Failed to load document details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: unknown) => {
    if (value == null || value === '') return '—';
    const s = String(value);
    const date = new Date(s);
    if (Number.isNaN(date.getTime())) return s;
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
      </View>
    );
  }

  if (!detail) {
    return null;
  }

  const fileName = (detail.file_name as string) || 'Document';
  const approvalStatus = String(detail.approval_status ?? '—');
  const glStatus = String(detail.gl_posting_status ?? '—');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.fileName}>{fileName}</Text>
        <StatusBadge status={approvalStatus} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Invoice #</Text>
          <Text style={styles.value}>{String(detail.invoice_number ?? '—')}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>GL posting</Text>
          <Text style={styles.value}>{glStatus}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{formatDate(detail.created_on)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fileName: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing[4],
    padding: theme.spacing[5],
  },
  sectionTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[4],
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  value: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weight.medium,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing[3],
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  });
