import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DocumentDetailScreenProps } from '../types/navigation';
import documentService, { Document } from '../services/document.service';

export default function DocumentDetailScreen({ route, navigation }: DocumentDetailScreenProps) {
  const { documentId } = route.params;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadDocumentDetail();
  }, [documentId]);

  const loadDocumentDetail = async () => {
    try {
      const data = await documentService.getDocumentDetail(documentId);
      setDocument(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load document details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!document) return;

    Alert.alert('Retry Processing', 'Are you sure you want to retry processing this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Retry',
        onPress: async () => {
          setRetrying(true);
          try {
            const updatedDoc = await documentService.retryDocument(document.id);
            setDocument(updatedDoc);
            Alert.alert('Success', 'Document queued for reprocessing');
          } catch (error: any) {
            Alert.alert('Error', 'Failed to retry document processing');
          } finally {
            setRetrying(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'processing':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.fileName}>{document.file_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(document.status) }]}>
          <Text style={styles.statusText}>{document.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>File Type:</Text>
          <Text style={styles.value}>{document.file_type || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>File Size:</Text>
          <Text style={styles.value}>{formatFileSize(document.file_size)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Uploaded:</Text>
          <Text style={styles.value}>{formatDate(document.uploaded_at)}</Text>
        </View>

        {document.processed_at && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Processed:</Text>
            <Text style={styles.value}>{formatDate(document.processed_at)}</Text>
          </View>
        )}
      </View>

      {document.status === 'failed' && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.retryButtonText}>Retry Processing</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
