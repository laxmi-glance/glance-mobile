import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProcessingQueueScreenProps } from '../types/navigation';
import authService from '../services/auth.service';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DocumentCard from '../components/dashboard/DocumentCard';
import UploadFab from '../components/dashboard/UploadFab';
import documentService, { DocumentListItem, DocumentStats } from '../services/document.service';
import companyService from '../services/company.service';
import { useTheme } from '../theme';

type DashboardTab = 'my_uploads' | 'pending_approval' | 'team_documents';

const TABS: Array<{ key: DashboardTab; label: string }> = [
  { key: 'my_uploads', label: 'My Uploads' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'team_documents', label: 'Team Documents' },
];

function resolveStatus(item: DocumentListItem): string {
  if (item.approval_status) return String(item.approval_status).toLowerCase();
  if (item.status) return 'processing';
  return 'pending';
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

export default function ProcessingQueueScreen({ navigation }: ProcessingQueueScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('my_uploads');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const requestTokenRef = useRef(0);

  const loadDocuments = useCallback(async (pageNum = 1) => {
    const requestToken = ++requestTokenRef.current;
    try {
      const response = await documentService.getProcessingQueue({ page: pageNum });
      if (requestToken !== requestTokenRef.current) {
        return;
      }

      if (pageNum === 1) {
        setDocuments(response.results);
      } else {
        setDocuments((prev) => [...prev, ...response.results]);
      }

      setHasMore(!!response.next);
      setPage(pageNum);
    } catch {
      if (requestToken !== requestTokenRef.current) {
        return;
      }
      Alert.alert('Error', 'Failed to load documents. Please try again.');
    } finally {
      if (requestToken !== requestTokenRef.current) {
        return;
      }
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const summary = await documentService.getDocumentStats();
      setStats(summary);
    } catch {
      // Non-blocking
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const [company, user] = await Promise.all([companyService.getSelectedCompany(), authService.getCurrentUser()]);
          if (!isActive) {
            return;
          }
          if (!company) {
            navigation.replace('CompanySelection');
            return;
          }
          setCompanyName(company.company_name || 'Workspace');
          setUsername(String(user?.username || user?.email || '').trim());
          await Promise.all([loadDocuments(1), loadStats()]);
        } catch {
          if (!isActive) {
            return;
          }
          Alert.alert('Error', 'Could not load dashboard.');
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      })();

      return () => {
        isActive = false;
        requestTokenRef.current += 1;
      };
    }, [loadDocuments, loadStats, navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadDocuments(1), loadStats()]);
  }, [loadDocuments, loadStats]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadDocuments(page + 1);
    }
  };

  const filteredDocuments = useMemo(() => {
    const normalizedUsername = username.toLowerCase();
    return documents.filter((item) => {
      const status = resolveStatus(item);
      const creator = String(item.created_by_username || '').toLowerCase();
      const isMine = normalizedUsername ? creator === normalizedUsername : false;

      if (activeTab === 'pending_approval') return status === 'pending';
      if (activeTab === 'team_documents') return !!creator && !isMine;
      if (!creator) return true;
      return isMine;
    });
  }, [activeTab, documents, username]);

  const openDocument = (item: DocumentListItem) => {
    if (item.approval_status == null && item.status) {
      Alert.alert('Processing', 'This file is still being processed.');
      return;
    }
    navigation.navigate('DocumentDetail', { documentId: item.id });
  };

  const updateApproval = async (item: DocumentListItem, target: 'approved' | 'rejected') => {
    setActionLoadingId(item.id);
    try {
      await documentService.updateDocumentStatus(item.id, target);
      await Promise.all([loadDocuments(1), loadStats()]);
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        `Failed to mark as ${target}.`;
      Alert.alert('Action failed', String(detail));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = (item: DocumentListItem) => {
    updateApproval(item, 'approved');
  };

  const handleReject = (item: DocumentListItem) => {
    Alert.alert('Reject document?', 'This will mark the document as rejected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => updateApproval(item, 'rejected') },
    ]);
  };

  const emptyMessage = useMemo(() => {
    if (activeTab === 'pending_approval') return 'No approvals pending right now.';
    if (activeTab === 'team_documents') return 'No team documents to show yet.';
    return 'No uploads yet. Start by uploading a document.';
  }, [activeTab]);

  const renderDocumentItem = ({ item }: { item: DocumentListItem }) => {
    const status = resolveStatus(item);
    const title = item.file_name || item.invoice_number || 'Document';
    const showActions = activeTab === 'pending_approval' && status === 'pending';

    return (
      <DocumentCard
        title={title}
        createdAtLabel={formatDate(item.created_on)}
        status={status}
        onPress={() => openDocument(item)}
        showApprovalActions={showActions}
        onApprove={() => handleApprove(item)}
        onReject={() => handleReject(item)}
        actionLoading={actionLoadingId === item.id}
      />
    );
  };

  const handleChangeCompany = () => {
    navigation.replace('CompanySelection');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Documents"
        companyName={companyName}
        userLabel={username || 'User'}
        onChangeTenant={handleChangeCompany}
        onNotificationPress={() => Alert.alert('Notifications', 'No new notifications.')}
        onProfilePress={() => Alert.alert('Profile', username || 'User profile')}
      />

      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending Approvals</Text>
          <Text style={styles.summaryValue}>{stats?.pending ?? 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Uploaded by Me</Text>
          <Text style={styles.summaryValue}>{documents.filter((d) => (d.created_by_username || '').toLowerCase() === username.toLowerCase()).length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Team Documents</Text>
          <Text style={styles.summaryValue}>{documents.filter((d) => !!d.created_by_username && (d.created_by_username || '').toLowerCase() !== username.toLowerCase()).length}</Text>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        {TABS.map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, selected && styles.tabBtnSelected]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredDocuments}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primaryAccent}
            colors={[theme.colors.primaryAccent]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        onEndReached={activeTab === 'my_uploads' ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} color={theme.colors.primaryAccent} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('UploadDocument')}>
                <Text style={styles.emptyCtaText}>Upload document</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <UploadFab onPress={() => navigation.navigate('UploadDocument')} />

      {loading && page === 1 ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2] + 2,
    gap: theme.spacing[2],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[2] + 2,
    paddingHorizontal: theme.spacing[2] + 2,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.xs,
    marginBottom: theme.spacing[1],
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  tabsWrap: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2] + 2,
    gap: theme.spacing[2],
  },
  tabBtn: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing[2] + 2,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  tabBtnSelected: {
    backgroundColor: theme.colors.primaryAccent,
  },
  tabLabel: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  tabLabelSelected: {
    color: theme.colors.onPrimary,
  },
  listContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: 100,
  },
  emptyContainer: {
    marginTop: theme.spacing[8] + theme.spacing[1],
    alignItems: 'center',
  },
  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.md,
    marginBottom: theme.spacing[3],
    textAlign: 'center',
    paddingHorizontal: theme.spacing[5],
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  emptyCta: {
    backgroundColor: theme.colors.primaryAccent,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2] + 2,
    borderRadius: theme.radius.md,
  },
  emptyCtaText: {
    color: theme.colors.onPrimary,
    fontWeight: theme.typography.weight.bold,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    marginVertical: theme.spacing[4],
  },
  });
