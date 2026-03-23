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
import AppButton from '../components/common/AppButton';

type DashboardTab = 'my_uploads' | 'approval_request' | 'approval_awaiting';

const TABS: Array<{ key: DashboardTab; label: string }> = [
  { key: 'my_uploads', label: 'My Uploads' },
  { key: 'approval_request', label: 'Approval Request' },
  { key: 'approval_awaiting', label: 'Approval Awaiting' },
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
    const canIdentifyOwner = normalizedUsername.length > 0;

    return documents.filter((item) => {
      const status = resolveStatus(item);
      const creator = String(item.created_by_username || '').toLowerCase();
      const hasCreator = creator.length > 0;
      const isMine = canIdentifyOwner && creator === normalizedUsername;

      if (activeTab === 'approval_request') {
        // Requests pending for approval.
        // If owner is not identifiable, fall back to all pending docs.
        if (!canIdentifyOwner || !hasCreator) return status === 'pending';
        return status === 'pending' && !isMine;
      }

      if (activeTab === 'approval_awaiting') {
        // My uploads currently in approval workflow.
        // If owner is not identifiable, show all docs with approval status.
        if (!canIdentifyOwner || !hasCreator) return !!item.approval_status;
        return isMine && !!item.approval_status;
      }

      // My Uploads
      // If owner is not identifiable, show all docs to avoid empty dashboard.
      if (!canIdentifyOwner || !hasCreator) return true;
      return isMine;
    });
  }, [activeTab, documents, username]);

  const tabCounts = useMemo(() => {
    const normalizedUsername = username.toLowerCase();
    const canIdentifyOwner = normalizedUsername.length > 0;
    let myUploads = 0;
    let approvalRequest = 0;
    let approvalAwaiting = 0;

    for (const item of documents) {
      const status = resolveStatus(item);
      const creator = String(item.created_by_username || '').toLowerCase();
      const hasCreator = creator.length > 0;
      const isMine = canIdentifyOwner && creator === normalizedUsername;

      if (!canIdentifyOwner || !hasCreator) {
        myUploads += 1;
        if (status === 'pending') approvalRequest += 1;
        if (item.approval_status) approvalAwaiting += 1;
        continue;
      }

      if (isMine) myUploads += 1;
      if (status === 'pending' && !isMine) approvalRequest += 1;
      if (isMine && !!item.approval_status) approvalAwaiting += 1;
    }

    const fallbackPending = stats?.pending ?? 0;

    return {
      my_uploads: myUploads,
      approval_request: approvalRequest || fallbackPending,
      approval_awaiting: approvalAwaiting,
    } as const;
  }, [documents, username, stats]);

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
    if (activeTab === 'approval_request') return 'No approval requests assigned right now.';
    if (activeTab === 'approval_awaiting') return 'No documents are currently awaiting approval.';
    return 'No uploads yet. Start by uploading a document.';
  }, [activeTab]);

  const renderDocumentItem = ({ item }: { item: DocumentListItem }) => {
    const status = resolveStatus(item);
    const title = item.file_name || item.invoice_number || 'Document';
    const showActions = activeTab === 'approval_request' && status === 'pending';

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
    navigation.navigate('CompanySelection');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title={companyName || 'Active Company'}
        companyName={companyName}
        userLabel={username || 'User'}
        onChangeTenant={handleChangeCompany}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => undefined}
        onOpenThemeSettings={() => navigation.navigate('ThemeSettings')}
        onLogout={handleLogout}
      />

      <View style={styles.summaryCards}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const value = tabCounts[tab.key] ?? 0;
          const summaryCardStyle = [styles.summaryCard, isActive ? styles.summaryCardActive : null];
          const summaryLabelStyle = [styles.summaryLabel, isActive ? styles.summaryLabelActive : null];
          const summaryValueStyle = [styles.summaryValue, isActive ? styles.summaryValueActive : null];
          return (
            <TouchableOpacity
              key={`summary-${tab.key}`}
              style={summaryCardStyle}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.9}
            >
              <Text style={summaryLabelStyle}>{tab.label}</Text>
              <Text style={summaryValueStyle}>{value}</Text>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} color={theme.colors.primaryAccent} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <AppButton
                label="Upload document"
                variant="primary"
                onPress={() => navigation.navigate('UploadDocument')}
                style={styles.emptyCta}
              />
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
    paddingBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardActive: {
    backgroundColor: theme.colors.primaryAccent,
    borderColor: theme.colors.primaryAccent,
    borderWidth: 1,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.xs,
    marginBottom: theme.spacing[1],
    fontFamily: theme.typography.fontFamilyPrimary,
    textAlign: 'center',
  },
  summaryLabelActive: {
    color: theme.colors.onPrimary,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    fontFamily: theme.typography.fontFamilyPrimary,
    textAlign: 'center',
  },
  summaryValueActive: {
    color: theme.colors.onPrimary,
  },
  listContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: 100,
  },
  emptyContainer: {
    marginTop: theme.spacing[10],
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
    minWidth: 160,
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
