import React, { useEffect, useState } from 'react';
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

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return '#34C759';
  if (s === 'rejected') return '#FF3B30';
  if (s === 'pending') return '#FF9500';
  return '#8E8E93';
}

export default function DocumentDetailScreen({ route, navigation }: DocumentDetailScreenProps) {
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
        <ActivityIndicator size="large" color="#007AFF" />
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(approvalStatus) }]}>
          <Text style={styles.statusText}>{approvalStatus.toUpperCase()}</Text>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 15,
    color: '#666',
  },
  value: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
});
