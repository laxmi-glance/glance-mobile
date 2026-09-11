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
import type { PreprocessingDocument, QueueStats, QueueSummaryStatus } from "../types/models";
import DocumentRow from "../components/DocumentRow";
import EmptyState from "../components/EmptyState";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import { apiErrorMessage } from "../utils/errors";
import { mergeUniqueById } from "../utils/lists";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

export default function ProcessingQueueScreen({ navigation }: QueueScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [documents, setDocuments] = useState<PreprocessingDocument[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<QueueSummaryStatus | undefined>();
  const searchRef = useRef(search);
  const fetchGen = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const loadDocuments = useCallback(
    async (pageNum = 1, replace = false, query = searchRef.current) => {
      const isReplace = replace || pageNum === 1;
      if (isReplace) {
        fetchGen.current += 1;
      }
      const gen = fetchGen.current;
      try {
        const [queue, queueStats] = await Promise.all([
          documentService.getProcessingQueue({
            page: pageNum,
            search: query.trim() || undefined,
            summary_status: summaryStatus,
          }),
          pageNum === 1 ? documentService.getQueueStats() : Promise.resolve(null),
        ]);
        if (gen !== fetchGen.current) {
          return;
        }

        setDocuments((prev) => mergeUniqueById(prev, queue.results, replace || pageNum === 1));
        setHasMore(Boolean(queue.next));
        setPage(pageNum);
        if (queueStats) {
          setStats(queueStats);
        }
      } catch (error: unknown) {
        if (gen !== fetchGen.current) {
          return;
        }
        Alert.alert("Could not load queue", apiErrorMessage(error));
      } finally {
        if (gen !== fetchGen.current) {
          return;
        }
        loadingMoreRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [summaryStatus]
  );

  useEffect(() => {
    void loadDocuments(1, true);
  }, [loadDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDocuments(1, true);
  }, [loadDocuments]);

  const loadMore = () => {
    if (loading || loadingMoreRef.current || refreshing || !hasMore) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void loadDocuments(page + 1);
  };

  const handleSearch = () => {
    searchRef.current = search;
    setPage(1);
    setLoading(true);
    void loadDocuments(1, true, search);
  };

  const applyStatus = (next: QueueSummaryStatus | undefined) => {
    if (summaryStatus === next) {
      return;
    }
    setPage(1);
    setLoading(true);
    setSummaryStatus(next);
  };

  return (
    <Screen edges={["bottom"]}>
      <PageHeader
        title="Queue"
        subtitle="Documents in processing"
        icon="file-tray-full-outline"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
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
            active={!summaryStatus}
            onPress={() => applyStatus(undefined)}
          />
          <StatChip
            label="In progress"
            value={stats.processing}
            active={summaryStatus === "processing"}
            onPress={() => applyStatus("processing")}
          />
          <StatChip
            label="Done"
            value={stats.completed}
            active={summaryStatus === "completed"}
            onPress={() => applyStatus("completed")}
          />
          <StatChip
            label="Issues"
            value={stats.failed}
            accent={stats.failed > 0}
            active={summaryStatus === "failed"}
            onPress={() => applyStatus("failed")}
          />
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          placeholder="Search file name"
          placeholderTextColor={colors.textPlaceholder}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
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

      {loading ? (
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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

function createStyles({ colors, type }: ThemeTokens) {
  return {
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
      paddingHorizontal: 4,
      alignItems: "center",
    },
    statChipActive: {
      backgroundColor: colors.brandSoft,
      borderColor: colors.brand,
    },
    statValue: {
      ...type.heading,
      color: colors.text,
    },
    statValueActive: {
      color: colors.brand,
    },
    statLabel: {
      ...type.overline,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: "center",
    },
    statLabelActive: {
      color: colors.brand,
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
      ...type.input,
      flex: 1,
      paddingVertical: 10,
    },
    list: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xxxl,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingMore: {
      marginVertical: space.lg,
    },
  };
}
