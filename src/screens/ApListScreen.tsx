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
import PageHeader from "../components/PageHeader";
import { apiErrorMessage } from "../utils/errors";
import { useRbac } from "../hooks/useRbac";
import { isProcessingRow } from "../utils/approval";
import { mergeUniqueById } from "../utils/lists";
import { colors, radius, space } from "../theme";

export default function ApListScreen({ navigation }: ApScreenProps) {
  const { canViewAp, config, loading: rbacLoading } = useRbac();
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
        Alert.alert("Could not load documents", apiErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [approvalStatus]
  );

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
      <Screen edges={[]}>
        <PageHeader
          title="Documents"
          subtitle="Processed Documents list"
          icon="documents-outline"
        />
        <EmptyState
          icon="lock-closed-outline"
          title="Documents are not available"
          hint="Your role cannot view documents in this workspace."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <PageHeader
        title="Documents"
        subtitle="Processed Documents list"
        icon="documents-outline"
        supportingIcon="file-tray-full-outline"
        supportingAccessibilityLabel="Open processing queue"
        onSupportingPress={() => navigation.navigate("Queue")}
        menuActions={[
          {
            key: "refresh",
            label: "Refresh",
            onPress: () => {
              setRefreshing(true);
              void loadDocuments(1, true);
            },
          },
        ]}
      />

      {stats ? (
        <View style={styles.statsRow}>
          <StatChip
            label="Total"
            value={stats.total}
            active={!approvalStatus}
            onPress={() => setApprovalStatus(undefined)}
          />
          <StatChip
            label="Pending"
            value={stats.pending}
            active={approvalStatus === "pending"}
            onPress={() => setApprovalStatus("pending")}
          />
          <StatChip
            label="Approved"
            value={stats.approved}
            active={approvalStatus === "approved"}
            onPress={() => setApprovalStatus("approved")}
          />
          <StatChip
            label="Rejected"
            value={stats.rejected}
            accent={stats.rejected > 0}
            active={approvalStatus === "rejected"}
            onPress={() => setApprovalStatus("rejected")}
          />
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
              title="No documents yet"
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

function StatChip({
  label,
  value,
  accent,
  active,
  onPress,
}: {
  label: string;
  value: number;
  accent?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statChip, active && styles.statChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
    >
      <Text
        style={[
          styles.statValue,
          accent && { color: colors.danger },
          active && styles.statValueActive,
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, active && styles.statLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
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
  statChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  statValueActive: {
    color: colors.brand,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statLabelActive: {
    color: colors.brand,
    fontWeight: "700",
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
  list: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
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
