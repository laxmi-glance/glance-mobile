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
import Button from "../components/Button";
import ReportPeriodBar from "../components/reports/ReportPeriodBar";
import { usePagedReport, useReportRange } from "../hooks/useReportRange";
import { useRbac } from "../hooks/useRbac";
import accountingService from "../services/accounting.service";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { AccountBalance, LedgerAccount, LedgerTransaction } from "../types/accounting";
import type { RootStackParamList } from "../types/navigation";
import {
  formatDrCr,
  formatSideAmount,
  ledgerGroupPath,
  ledgerNature,
  previousIsoDate,
  voucherLabel,
} from "../utils/accounting";
import { formatDate } from "../utils/dates";
import { humanizeKey } from "../utils/money";

type Props = NativeStackScreenProps<RootStackParamList, "LedgerAccount">;

export default function LedgerAccountScreen({ navigation, route }: Props) {
  const { accountId, title } = route.params;
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { allows, loading: rbacLoading } = useRbac();
  const canViewLedger = allows("ledger", "view");
  const canViewGl = allows("gl", "view");
  const { range, presets, setRange, ready } = useReportRange("range");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<LedgerAccount | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [opening, setOpening] = useState<AccountBalance | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const next = await accountingService.getLedgerAccount(accountId);
      setAccount(next);
    } catch {
      setAccountError("Could not load this ledger account.");
    } finally {
      setAccountLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (rbacLoading || !canViewLedger) {
      return;
    }
    void loadAccount(); // eslint-disable-line react-hooks/set-state-in-effect -- load ledger after permission check
  }, [canViewLedger, loadAccount, rbacLoading]);

  useEffect(() => {
    if (!ready || !canViewGl) {
      return;
    }
    let cancelled = false;
    accountingService
      .getOpeningBalance(accountId, previousIsoDate(range.startDate))
      .then((value) => {
        if (!cancelled) {
          setOpening(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpening(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, canViewGl, range.startDate, ready]);

  const fetchPage = useCallback(
    (page: number) =>
      accountingService.listLedgerTransactions({
        accountId,
        page,
        search: query || undefined,
        dateFrom: range.startDate,
        dateTo: range.endDate,
        includeRunningBalance: !query,
      }),
    [accountId, query, range.endDate, range.startDate]
  );
  const transactions = usePagedReport<LedgerTransaction>(
    ready && canViewGl && !rbacLoading,
    `${accountId}|${query}|${range.startDate}|${range.endDate}`,
    fetchPage
  );

  const heading = account?.title || title || "Ledger";
  const facts = accountFacts(account);

  return (
    <Screen edges={[]}>
      <PageHeader
        title={heading}
        subtitle="Ledger account"
        icon="reader-outline"
        showBack
        onBack={() => navigation.goBack()}
      />

      {rbacLoading || (accountLoading && !account) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canViewLedger ? (
        <EmptyState
          icon="lock-closed-outline"
          title="This ledger is not available"
          hint="Your role cannot view ledger accounts in this workspace."
        />
      ) : accountError && !account ? (
        <View style={styles.center}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load ledger"
            hint={accountError}
          />
          <Button label="Try again" onPress={() => void loadAccount()} />
        </View>
      ) : (
        <FlatList
          data={canViewGl ? transactions.items : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={transactions.refreshing}
              onRefresh={() => void transactions.refresh()}
              tintColor={colors.brand}
            />
          }
          onEndReached={() => {
            if (canViewGl) {
              void transactions.loadMore();
            }
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View>
              {facts.length ? (
                <View style={styles.facts}>
                  {facts.map((fact) => (
                    <View key={fact.label} style={styles.fact}>
                      <Text style={styles.factLabel}>{fact.label}</Text>
                      <Text style={styles.factValue}>{fact.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {canViewGl ? (
                <>
                  <Text style={styles.section}>Transactions</Text>
                  <ReportPeriodBar
                    range={range}
                    presets={presets}
                    onRangeChange={setRange}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search narration"
                  />
                  {!query && opening ? (
                    <View style={styles.opening}>
                      <Text style={styles.openingLabel}>Opening balance</Text>
                      <Text style={styles.openingValue}>{formatDrCr(opening.balance)}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.lockedHint}>
                  Journal lines for this ledger are hidden for your role.
                </Text>
              )}

              {canViewGl && transactions.error && transactions.items.length === 0 ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="Could not load transactions"
                  hint={transactions.error}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            canViewGl && transactions.loading ? (
              <ActivityIndicator style={styles.footer} color={colors.brand} />
            ) : canViewGl && !transactions.error ? (
              <EmptyState
                icon="book-outline"
                title="No transactions"
                hint={
                  query
                    ? "Nothing in this period matches that search."
                    : "This ledger has no journal lines in the selected period."
                }
              />
            ) : null
          }
          ListFooterComponent={
            transactions.loadingMore ? <ActivityIndicator style={styles.footer} /> : null
          }
          renderItem={({ item }) => {
            const entry = item.journal_entry;
            const particulars = item.particulars || item.line_narration || entry?.narration || "—";
            return (
              <TouchableOpacity
                style={styles.row}
                disabled={!entry?.id}
                onPress={() => {
                  if (entry?.id) {
                    navigation.navigate("JournalEntry", { entryId: entry.id });
                  }
                }}
                accessibilityRole="button"
              >
                <View style={styles.rowHead}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {entry ? voucherLabel(entry) : "Journal line"}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(entry?.date)}</Text>
                </View>
                <Text style={styles.particulars} numberOfLines={2}>
                  {particulars}
                </Text>
                <View style={styles.amounts}>
                  <Amount label="Debit" value={formatSideAmount(item.debit_amount)} />
                  <Amount label="Credit" value={formatSideAmount(item.credit_amount)} />
                  {!query && item.running_balance != null ? (
                    <Amount label="Balance" value={formatDrCr(item.running_balance)} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}

function accountFacts(account: LedgerAccount | null): { label: string; value: string }[] {
  if (!account) {
    return [];
  }
  const nature = ledgerNature(account);
  const tax = account.tax_rate == null || account.tax_rate === "" ? "" : `${account.tax_rate}%`;
  const rows = [
    { label: "Group", value: ledgerGroupPath(account.ledger_group) },
    { label: "Nature", value: nature },
    { label: "Code", value: account.statutory_code || "" },
    { label: "Tax rate", value: tax },
    { label: "GST type", value: account.gst_type ? humanizeKey(account.gst_type) : "" },
    {
      label: "TDS",
      value: account.tds_ledger_detail?.section_name || account.tds_ledger_detail?.section_id || "",
    },
    { label: "Source", value: account.source_system ? humanizeKey(account.source_system) : "" },
    { label: "Description", value: account.description || "" },
  ];
  return rows.filter((row) => row.value && row.value !== "Ungrouped");
}

function Amount({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.amount}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{value}</Text>
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: space.lg,
    },
    list: {
      paddingBottom: space.xxxl,
      flexGrow: 1,
    },
    facts: {
      marginHorizontal: space.lg,
      marginTop: space.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
    },
    fact: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    factLabel: {
      ...type.overline,
      textTransform: "uppercase",
    },
    factValue: {
      ...type.body,
      marginTop: 2,
    },
    section: {
      ...type.overline,
      textTransform: "uppercase",
      marginHorizontal: space.lg,
      marginTop: space.lg,
      marginBottom: space.sm,
    },
    lockedHint: {
      ...type.meta,
      marginHorizontal: space.lg,
      marginTop: space.lg,
    },
    opening: {
      marginHorizontal: space.lg,
      marginTop: space.sm,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.brandSoft,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: 12,
    },
    openingLabel: {
      ...type.label,
      color: colors.brand,
    },
    openingValue: {
      ...type.subtitle,
      color: colors.brand,
    },
    row: {
      marginHorizontal: space.lg,
      marginTop: space.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
    },
    rowHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: space.sm,
    },
    rowTitle: {
      ...type.subtitle,
      flex: 1,
    },
    rowDate: {
      ...type.meta,
    },
    particulars: {
      ...type.meta,
      marginTop: 6,
    },
    amounts: {
      flexDirection: "row",
      gap: space.md,
      marginTop: space.md,
    },
    amount: {
      flex: 1,
    },
    amountLabel: {
      ...type.overline,
    },
    amountValue: {
      ...type.label,
      marginTop: 2,
    },
    footer: {
      marginVertical: space.lg,
    },
  };
}
