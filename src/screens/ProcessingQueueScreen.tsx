import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { QueueScreenProps } from "../types/navigation";
import documentService from "../services/document.service";
import tenantService from "../services/tenant.service";
import type { PreprocessingDocument, QueueStats, QueueSummaryStatus } from "../types/models";
import DocumentRow from "../components/DocumentRow";
import EmptyState from "../components/EmptyState";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { apiErrorMessage } from "../utils/errors";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { mergeUniqueById } from "../utils/lists";
import { colors, radius, space } from "../theme";

const FILTERS: { label: string; value?: QueueSummaryStatus }[] = [
  { label: "All" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Issues", value: "failed" },
];

export default function ProcessingQueueScreen({ navigation }: QueueScreenProps) {
  const [documents, setDocuments] = useState<PreprocessingDocument[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [search, setSearch] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<QueueSummaryStatus | undefined>();
  const searchRef = useRef(search);
  searchRef.current = search;

  const loadCompanyInfo = useCallback(async () => {
    const tenant = await tenantService.getSelectedTenant();
    if (tenant) {
      setCompanyName(tenant.company_name);
    }
  }, []);

  const loadDocuments = useCallback(
    async (pageNum = 1, replace = false) => {
      try {
        const [queue, queueStats] = await Promise.all([
          documentService.getProcessingQueue({
            page: pageNum,
            search: searchRef.current.trim() || undefined,
            summary_status: summaryStatus,
          }),
          pageNum === 1 ? documentService.getQueueStats() : Promise.resolve(null),
        ]);

        setDocuments((prev) => mergeUniqueById(prev, queue.results, replace || pageNum === 1));
        setHasMore(Boolean(queue.next));
        setPage(pageNum);
        if (queueStats) {
          setStats(queueStats);
        }
      } catch (error: unknown) {
        Alert.alert("Could not load queue", apiErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [summaryStatus]
  );

  const { uploading, upload } = useDocumentUpload(() => {
    void loadDocuments(1, true);
  });

  useEffect(() => {
    void loadCompanyInfo();
  }, [loadCompanyInfo]);

  useEffect(() => {
    setLoading(true);
    void loadDocuments(1, true);
  }, [loadDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDocuments(1, true);
  }, [loadDocuments]);

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) {
      return;
    }
    setLoadingMore(true);
    loadDocuments(page + 1);
  };

  const handleSearch = () => {
    setLoading(true);
    loadDocuments(1, true);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Processing queue</Text>
          <Text style={styles.company}>{companyName}</Text>
        </View>
        <Button
          label="Upload"
          icon="cloud-upload-outline"
          onPress={upload}
          loading={uploading}
          style={styles.uploadBtn}
        />
      </View>

      {stats ? (
        <View style={styles.statsRow}>
          <StatChip label="Total" value={stats.total} />
          <StatChip label="In progress" value={stats.processing} />
          <StatChip label="Done" value={stats.completed} />
          <StatChip label="Issues" value={stats.failed} accent={stats.failed > 0} />
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Search file name"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const active = summaryStatus === filter.value;
          return (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSummaryStatus(filter.value)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={documents}
        renderItem={({ item }) => (
          <DocumentRow
            item={item}
            onPress={() => navigation.navigate("DocumentDetail", { documentId: item.id })}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No documents in this queue"
              hint="Capture a receipt or upload a PDF to get started."
            />
          ) : null
        }
      />

      {loading && page === 1 ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : null}
    </Screen>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, accent && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    gap: space.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textHeading,
  },
  company: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxxl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingMore: {
    marginVertical: space.lg,
  },
});
