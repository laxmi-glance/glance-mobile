import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ReportPeriodBar from "../components/reports/ReportPeriodBar";
import { usePagedReport, useReportRange } from "../hooks/useReportRange";
import { useRbac } from "../hooks/useRbac";
import accountingService from "../services/accounting.service";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { JournalEntryListItem } from "../types/accounting";
import type { RootStackParamList } from "../types/navigation";
import { postingStatusLabel, postingStatusTone, voucherLabel } from "../utils/accounting";
import { formatDate } from "../utils/dates";
import { formatInr } from "../utils/money";

type Props = NativeStackScreenProps<RootStackParamList, "GeneralLedger">;

export default function GeneralLedgerScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { allows, loading: rbacLoading } = useRbac();
  const canView = allows("gl", "view");
  const { range, presets, setRange, ready } = useReportRange("range");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    (page: number) =>
      accountingService.listJournalEntries({
        page,
        search: query || undefined,
        dateFrom: range.startDate,
        dateTo: range.endDate,
      }),
    [query, range.endDate, range.startDate]
  );
  const entries = usePagedReport<JournalEntryListItem>(
    ready && canView && !rbacLoading,
    `${query}|${range.startDate}|${range.endDate}`,
    fetchPage
  );

  return (
    <Screen edges={[]}>
      <PageHeader
        title="General ledger"
        subtitle="Journal entries"
        icon="book-outline"
        showBack
        onBack={() => navigation.goBack()}
        menuActions={[{ key: "refresh", label: "Refresh", onPress: () => void entries.refresh() }]}
      />

      {rbacLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="General ledger is not available"
          hint="Your role cannot view journal entries in this workspace."
        />
      ) : (
        <View style={styles.body}>
          <ReportPeriodBar
            range={range}
            presets={presets}
            onRangeChange={setRange}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search voucher or narration"
          />
          <FlatList
            data={entries.items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={entries.refreshing}
                onRefresh={() => void entries.refresh()}
                tintColor={colors.brand}
              />
            }
            onEndReached={() => void entries.loadMore()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              entries.loadingMore ? <ActivityIndicator style={styles.footer} /> : null
            }
            ListEmptyComponent={
              entries.loading ? (
                <ActivityIndicator style={styles.footer} color={colors.brand} />
              ) : (
                <EmptyState
                  icon={entries.error ? "cloud-offline-outline" : "book-outline"}
                  title={entries.error ? "Could not load journal entries" : "No journal entries"}
                  hint={
                    entries.error ||
                    (query
                      ? "Nothing in this period matches that search."
                      : "Posted vouchers for the selected period will appear here.")
                  }
                />
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("JournalEntry", { entryId: item.id })}
                accessibilityRole="button"
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.ledger_name || voucherLabel(item)}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {formatDate(item.date)} · {voucherLabel(item)}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatInr(item.total_debit)}</Text>
                </View>
                {item.narration ? (
                  <Text style={styles.narration} numberOfLines={2}>
                    {item.narration}
                  </Text>
                ) : null}
                <View style={styles.cardFoot}>
                  <StatusBadge
                    label={postingStatusLabel(item.post_status)}
                    tone={postingStatusTone(item.post_status)}
                    compact
                  />
                  {item.is_balanced === false ? (
                    <Text style={styles.unbalanced}>Unbalanced</Text>
                  ) : (
                    <Text style={styles.lines}>
                      {item.lines_count ?? 0} {item.lines_count === 1 ? "line" : "lines"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </Screen>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    body: {
      flex: 1,
    },
    list: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xxxl,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      marginBottom: space.sm,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: space.md,
    },
    cardCopy: {
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      ...type.subtitle,
    },
    cardMeta: {
      ...type.meta,
      marginTop: 2,
    },
    amount: {
      ...type.subtitle,
    },
    narration: {
      ...type.meta,
      marginTop: 8,
    },
    cardFoot: {
      marginTop: space.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    lines: {
      ...type.overline,
    },
    unbalanced: {
      ...type.overline,
      color: colors.danger,
    },
    footer: {
      marginVertical: space.lg,
    },
  };
}
