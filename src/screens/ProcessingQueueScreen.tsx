import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ProcessingQueueScreenProps } from '../types/navigation';
import documentService, { DocumentListItem } from '../services/document.service';
import companyService from '../services/company.service';

function getRowStatus(item: DocumentListItem): string {
  if (item.approval_status) {
    return item.approval_status;
  }
  if (item.status) {
    return 'processing';
  }
  return 'pending';
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return '#34C759';
  if (s === 'rejected') return '#FF3B30';
  if (s === 'processing') return '#007AFF';
  if (s === 'pending') return '#FF9500';
  return '#8E8E93';
}

export default function ProcessingQueueScreen({ navigation }: ProcessingQueueScreenProps) {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [companyName, setCompanyName] = useState('');

  const loadDocuments = useCallback(async (pageNum: number = 1) => {
    try {
      const response = await documentService.getProcessingQueue({ page: pageNum });

      if (pageNum === 1) {
        setDocuments(response.results);
      } else {
        setDocuments((prev) => [...prev, ...response.results]);
      }

      setHasMore(!!response.next);
      setPage(pageNum);
    } catch {
      Alert.alert('Error', 'Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const company = await companyService.getSelectedCompany();
        if (company) {
          setCompanyName(company.company_name || 'Workspace');
        }
        await loadDocuments(1);
      })();
    }, [loadDocuments])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDocuments(1);
  }, [loadDocuments]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadDocuments(page + 1);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const openDocument = (item: DocumentListItem) => {
    if (item.approval_status == null && item.status) {
      Alert.alert('Processing', 'This file is still being processed.');
      return;
    }
    navigation.navigate('DocumentDetail', { documentId: item.id });
  };

  const renderDocumentItem = ({ item }: { item: DocumentListItem }) => {
    const status = getRowStatus(item);
    return (
      <TouchableOpacity style={styles.documentCard} onPress={() => openDocument(item)}>
        <View style={styles.documentHeader}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.file_name || item.invoice_number || 'Document'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>Created: {formatDate(item.created_on)}</Text>
      </TouchableOpacity>
    );
  };

  const handleChangeCompany = () => {
    navigation.replace('CompanySelection');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.companyText}>{companyName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UploadDocument')}
            style={styles.uploadButton}
          >
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChangeCompany} style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No documents found</Text>
            </View>
          ) : null
        }
      />

      {loading && page === 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginRight: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  companyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    marginVertical: 16,
  },
});
