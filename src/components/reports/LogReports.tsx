import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import reportsService from "../../services/reports.service";
import { usePagedReport, useReportRange } from "../../hooks/useReportRange";
import { formatDateTime } from "../../utils/dates";
import { humanizeKey } from "../../utils/money";
import {
  activityActionTone,
  activityChangeRows,
  activityObjectLabel,
  syncStatusTone,
} from "../../utils/reportLayout";
import ReportPeriodBar from "./ReportPeriodBar";
import StatusBadge from "../StatusBadge";
import EmptyState from "../EmptyState";
import Button from "../Button";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { SyncTrackerItem, UserActivityItem } from "../../types/reports";

const SYNC_FILTERS = [
  { id: "", label: "All" },
  { id: "success", label: "Success" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
  { id: "retry", label: "Retry" },
];

const MODEL_LABELS: Record<string, string> = {
  FinancialDocument: "Financial document",
  JournalEntry: "Journal entry",
  LedgerAccount: "Ledger account",
  LedgerGroup: "Ledger group",
  SyncTracker: "Sync tracker",
  ConnectedErp: "ERP connection",
};

export function UserActivityReport() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { range, presets, setRange, ready } = useReportRange();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const page = usePagedReport<UserActivityItem>(
    ready,
    `${range.startDate}:${range.endDate}:${query}`,
    (pageNumber) =>
      reportsService.getUserActivity({
        page: pageNumber,
        search: query,
        startDate: range.startDate,
        endDate: range.endDate,
      })
  );

  return (
    <View style={styles.flex}>
      <ReportPeriodBar
        range={range}
        presets={presets}
        onRangeChange={setRange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search user, action, or record"
      />
      <FlatList
        data={page.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={page.refreshing}
            onRefresh={() => void page.refresh()}
            tintColor={colors.brand}
          />
        }
        onEndReached={() => void page.loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          page.error && page.items.length ? (
            <Text style={styles.inlineError}>{page.error}</Text>
          ) : null
        }
        ListEmptyComponent={
          !ready || page.loading ? (
            <ActivityIndicator style={styles.loader} size="large" color={colors.brand} />
          ) : page.error ? (
            <View style={styles.errorBlock}>
              <EmptyState
                icon="cloud-offline-outline"
                title="Could not load activity"
                hint={page.error}
              />
              <Button label="Try again" onPress={() => void page.refresh()} />
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No activity in this period"
              hint="Workspace actions for the selected dates will show up here."
            />
          )
        }
        ListFooterComponent={
          page.loadingMore ? <ActivityIndicator style={styles.loader} color={colors.brand} /> : null
        }
        renderItem={({ item }) => {
          const open = openId === item.id;
          const changes = activityChangeRows(item.changes);
          const objectLabel = activityObjectLabel(item.object_repr);
          const related = item.related_activities || [];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setOpenId(open ? null : item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title}>{item.username || "System"}</Text>
                <Text style={styles.time}>{formatDateTime(item.timestamp)}</Text>
              </View>
              <View style={styles.badges}>
                <StatusBadge
                  label={item.action || "Activity"}
                  tone={activityActionTone(item.action)}
                />
                <StatusBadge
                  label={MODEL_LABELS[item.model || ""] || humanizeKey(item.model)}
                  tone="neutral"
                />
                {item.related_count && item.related_count > 1 ? (
                  <StatusBadge label={`${item.related_count} events`} tone="queued" />
                ) : null}
              </View>
              {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
              {objectLabel ? <Text style={styles.meta}>{objectLabel}</Text> : null}
              {item.file_name ? <Text style={styles.meta}>File: {item.file_name}</Text> : null}
              {item.latest_sync_status ? (
                <Text style={styles.meta}>Sync: {humanizeKey(item.latest_sync_status)}</Text>
              ) : null}
              {open ? (
                <View style={styles.detail}>
                  {changes.length ? (
                    changes.map((change) => (
                      <Text key={change.key} style={styles.change}>
                        {change.field}: {change.from} → {change.to}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.meta}>No field changes recorded.</Text>
                  )}
                  {related.length > 1
                    ? related.map((entry) => (
                        <Text key={entry.id} style={styles.change}>
                          {formatDateTime(entry.timestamp)} · {entry.action || "Activity"}
                          {entry.description ? ` · ${entry.description}` : ""}
                        </Text>
                      ))
                    : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export function SyncTrackerReport() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { range, presets, setRange, ready } = useReportRange();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, SyncTrackerItem>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const page = usePagedReport<SyncTrackerItem>(
    ready,
    `${range.startDate}:${range.endDate}:${query}:${status}`,
    (pageNumber) =>
      reportsService.getSyncTrackers({
        page: pageNumber,
        search: query,
        status,
        startDate: range.startDate,
        endDate: range.endDate,
      })
  );

  const openRow = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (!next || details[id]) {
      return;
    }
    setDetailId(id);
    void reportsService
      .getSyncTracker(id)
      .then((detail) => setDetails((current) => ({ ...current, [id]: detail })))
      .catch(() => undefined)
      .finally(() => setDetailId((current) => (current === id ? null : current)));
  };

  return (
    <View style={styles.flex}>
      <ReportPeriodBar
        range={range}
        presets={presets}
        onRangeChange={setRange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, voucher, or system"
      >
        <View style={styles.filters}>
          {SYNC_FILTERS.map((filter) => {
            const selected = filter.id === status;
            return (
              <TouchableOpacity
                key={filter.label}
                style={[styles.filter, selected && styles.filterSelected]}
                onPress={() => setStatus(filter.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ReportPeriodBar>
      <FlatList
        data={page.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={page.refreshing}
            onRefresh={() => void page.refresh()}
            tintColor={colors.brand}
          />
        }
        onEndReached={() => void page.loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          page.error && page.items.length ? (
            <Text style={styles.inlineError}>{page.error}</Text>
          ) : null
        }
        ListEmptyComponent={
          !ready || page.loading ? (
            <ActivityIndicator style={styles.loader} size="large" color={colors.brand} />
          ) : page.error ? (
            <View style={styles.errorBlock}>
              <EmptyState
                icon="cloud-offline-outline"
                title="Could not load sync history"
                hint={page.error}
              />
              <Button label="Try again" onPress={() => void page.refresh()} />
            </View>
          ) : (
            <EmptyState
              icon="sync-outline"
              title="No sync records in this period"
              hint="Tally and integration sync history will show up here."
            />
          )
        }
        ListFooterComponent={
          page.loadingMore ? <ActivityIndicator style={styles.loader} color={colors.brand} /> : null
        }
        renderItem={({ item }) => {
          const open = openId === item.id;
          const detail = details[item.id];
          const source = item.source_system?.display_name;
          const destination = item.destination_system?.display_name;
          const history = (detail?.history || []).slice(0, 6);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openRow(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title}>
                  {item.display_name || item.tally_voucher_number || "Sync record"}
                </Text>
                <StatusBadge
                  label={humanizeKey(item.last_sync_status || "unknown")}
                  tone={syncStatusTone(item.last_sync_status)}
                />
              </View>
              <Text style={styles.body}>{humanizeKey(item.entity_type)}</Text>
              {source || destination ? (
                <Text style={styles.meta}>
                  {[source || "Source", destination || "Destination"].join(" → ")}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {item.last_action ? `${humanizeKey(item.last_action)} · ` : ""}
                {item.last_synced_at ? formatDateTime(item.last_synced_at) : "Not synced yet"}
              </Text>
              {item.error_message ? (
                <Text style={styles.errorText}>{item.error_message}</Text>
              ) : null}
              {open ? (
                <View style={styles.detail}>
                  {detailId === item.id ? (
                    <ActivityIndicator color={colors.brand} />
                  ) : (
                    <>
                      <Text style={styles.meta}>Retries: {item.retry_count || 0}</Text>
                      {item.created_on ? (
                        <Text style={styles.meta}>Created {formatDateTime(item.created_on)}</Text>
                      ) : null}
                      {history.length ? (
                        history.map((entry, index) => (
                          <Text key={entry.id || `${item.id}-${index}`} style={styles.change}>
                            {formatDateTime(entry.synced_at)} ·{" "}
                            {humanizeKey(entry.status || entry.action)}
                            {entry.message ? ` · ${entry.message}` : ""}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.meta}>No earlier sync attempts on this record.</Text>
                      )}
                    </>
                  )}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    flex: {
      flex: 1,
    },
    list: {
      padding: space.lg,
      paddingTop: space.md,
      paddingBottom: 40,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      gap: space.sm,
      marginBottom: space.sm,
    },
    cardTop: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: space.sm,
    },
    title: {
      ...type.cardTitle,
      flex: 1,
    },
    time: {
      ...type.caption,
    },
    badges: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: space.sm,
    },
    body: {
      ...type.callout,
    },
    meta: {
      ...type.meta,
    },
    errorText: {
      ...type.meta,
      color: colors.danger,
    },
    detail: {
      gap: 6,
      paddingTop: space.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    change: {
      ...type.meta,
      color: colors.text,
    },
    filters: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: space.sm,
    },
    filter: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
    },
    filterSelected: {
      backgroundColor: colors.brandSoft,
    },
    filterLabel: {
      ...type.caption,
    },
    filterLabelSelected: {
      color: colors.brand,
    },
    loader: {
      marginTop: space.xl,
    },
    inlineError: {
      ...type.meta,
      color: colors.danger,
      marginBottom: space.sm,
    },
    errorBlock: {
      gap: space.md,
    },
  };
}
