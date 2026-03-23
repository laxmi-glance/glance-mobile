import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DocumentDetailScreenProps } from '../types/navigation';
import documentService from '../services/document.service';
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
  const normalizedStatus = approvalStatus.toLowerCase();
  const statusBannerStyle =
    normalizedStatus === 'approved'
      ? styles.statusBannerApproved
      : normalizedStatus === 'rejected'
        ? styles.statusBannerRejected
        : normalizedStatus === 'processing'
          ? styles.statusBannerProcessing
          : styles.statusBannerPending;
  const statusTextStyle =
    normalizedStatus === 'approved'
      ? styles.statusTextApproved
      : normalizedStatus === 'rejected'
        ? styles.statusTextRejected
        : normalizedStatus === 'processing'
          ? styles.statusTextProcessing
          : styles.statusTextPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Document Details</Text>
        <View style={styles.topHeaderSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Text style={styles.fileName}>{fileName}</Text>
          <View style={[styles.statusBanner, statusBannerStyle]}>
            <Text style={[styles.statusText, statusTextStyle]}>{approvalStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.sectionSpacer} />

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
    </SafeAreaView>
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
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: theme.button.height,
      height: theme.button.height,
      borderRadius: theme.button.radius,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    topHeaderTitle: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    topHeaderSpacer: {
      width: theme.button.height,
      height: theme.button.height,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing[6],
    },
    headerSection: {
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
    statusBanner: {
      borderRadius: theme.radius.pill,
      minHeight: 34,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
    },
    statusBannerApproved: {
      backgroundColor: theme.colors.statusApprovedBg,
    },
    statusBannerPending: {
      backgroundColor: theme.colors.statusPendingBg,
    },
    statusBannerRejected: {
      backgroundColor: theme.colors.statusRejectedBg,
    },
    statusBannerProcessing: {
      backgroundColor: theme.colors.statusProcessingBg,
    },
    statusText: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      letterSpacing: 0.3,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    statusTextApproved: {
      color: theme.colors.statusApprovedText,
    },
    statusTextPending: {
      color: theme.colors.statusPendingText,
    },
    statusTextRejected: {
      color: theme.colors.statusRejectedText,
    },
    statusTextProcessing: {
      color: theme.colors.statusProcessingText,
    },
    sectionSpacer: {
      height: theme.spacing[2],
      backgroundColor: theme.colors.surfaceMuted,
    },
    section: {
      backgroundColor: theme.colors.surface,
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
