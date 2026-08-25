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
import { ApScreenProps } from "../types/navigation";
import financialDocumentService from "../services/financialDocument.service";
import type {
  ApprovalStatus,
  FinancialDocumentListItem,
  FinancialDocumentStats,
} from "../types/models";
import ApDocumentRow from "../components/ApDocumentRow";
import EmptyState from "../components/EmptyState";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { apiErrorMessage } from "../utils/errors";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { useRbac } from "../hooks/useRbac";
import { isProcessingRow } from "../utils/approval";
import { mergeUniqueById } from "../utils/lists";
import { colors, radius, space } from "../theme";

const FILTERS: { label: string; value?: ApprovalStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function ApListScreen({ navigation }: ApScreenProps) {
  const { canUpload, canViewAp, config, loading: rbacLoading } = useRbac();
  const [documents, setDocuments] = useState<FinancialDocumentListItem[]>([]);
  const [stats, setStats] = useState<FinancialDocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | undefined>();
  const searchRef = useRef(search);
  searchRef.current = search;

  const loadDocuments = useCallback(
    async (pageNum = 1, replace = false) => {
      try {
        const [list, listStats] = await Promise.all([
          financialDocumentService.listApDocuments({
            page: pageNum,
            search: searchRef.current.trim() || undefined,
            approval_status: approvalStatus,
          }),
          pageNum === 1 ? financialDocumentService.getApStats() : Promise.resolve(null),
        ]);
        setDocuments((prev) => mergeUniqueById(prev, list.results, replace || pageNum === 1));
        setHasMore(Boolean(list.next));
        setPage(pageNum);
        if (listStats) {
          setStats(listStats);
        }
      } catch (error: unknown) {
        Alert.alert("Could not load payables", apiErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [approvalStatus]
  );

  const { uploading, upload } = useDocumentUpload(() => {
    void loadDocuments(1, true);
  });

  useEffect(() => {
    if (rbacLoading) {
      return;
    }
    setLoading(true);
    void loadDocuments(1, true);
  }, [loadDocuments, rbacLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDocuments(1, true);
  }, [loadDocuments]);

  const openItem = (item: FinancialDocumentListItem) => {
    if (isProcessingRow(item)) {
      navigation.navigate("DocumentDetail", { documentId: item.id });
      return;
    }
    navigation.navigate("ApDocument", { documentId: item.id });
  };

  if (!rbacLoading && config && !canViewAp) {
    return (
      <Screen>
        <EmptyState
          icon="lock-closed-outline"
          title="Payables are not available"
          hint="Your role cannot view AP documents in this workspace."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Payables</Text>
          <Text style={styles.subtitle}>Uploaded documents and approval status</Text>
        </View>
        {canUpload ? (
          <Button
            label="Upload"
            icon="cloud-upload-outline"
            onPress={upload}
            loading={uploading}
            style={styles.uploadBtn}
          />
        ) : null}
      </View>

      {stats ? (
        <View style={styles.statsRow}>
          <StatChip label="Total" value={stats.total} />
          <StatChip label="Pending" value={stats.pending} />
          <StatChip label="Approved" value={stats.approved} />
          <StatChip label="Rejected" value={stats.rejected} accent={stats.rejected > 0} />
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Search vendor or invoice"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => {
            setLoading(true);
            void loadDocuments(1, true);
          }}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const active = approvalStatus === filter.value;
          return (
            <TouchableOpacity
              key={filter.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setApprovalStatus(filter.value)}
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
        renderItem={({ item }) => <ApDocumentRow item={item} onPress={() => openItem(item)} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            setLoadingMore(true);
            void loadDocuments(page + 1);
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt-outline"
              title="No AP documents yet"
              hint="Capture a receipt or upload a PDF. Processed amounts appear here after OCR."
            />
          ) : null
        }
      />

      {(loading && page === 1) || rbacLoading ? (
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
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
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
