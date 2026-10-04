import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { usePagedReport } from "../hooks/useReportRange";
import { useRbac } from "../hooks/useRbac";
import accountingService from "../services/accounting.service";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { LedgerAccount, LedgerGroup } from "../types/accounting";
import type { RootStackParamList } from "../types/navigation";
import { ledgerGroupPath, ledgerNature } from "../utils/accounting";

type Props = NativeStackScreenProps<RootStackParamList, "ChartOfAccounts">;
type Tab = "accounts" | "groups";

export default function ChartOfAccountsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { allows, loading: rbacLoading } = useRbac();
  const canView = allows("ledger", "view");
  const [tab, setTab] = useState<Tab>("accounts");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [groupTitle, setGroupTitle] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAccounts = useCallback(
    (page: number) =>
      accountingService.listLedgerAccounts({
        page,
        search: query || undefined,
        groupTitle: groupTitle || undefined,
      }),
    [groupTitle, query]
  );
  const fetchGroups = useCallback(
    (page: number) => accountingService.listLedgerGroups({ page, search: query || undefined }),
    [query]
  );

  const accounts = usePagedReport<LedgerAccount>(
    canView && !rbacLoading && tab === "accounts",
    `accounts|${query}|${groupTitle || ""}`,
    fetchAccounts
  );
  const groups = usePagedReport<LedgerGroup>(
    canView && !rbacLoading && tab === "groups",
    `groups|${query}`,
    fetchGroups
  );
  const active = tab === "accounts" ? accounts : groups;

  const openGroup = (group: LedgerGroup) => {
    setGroupTitle(group.title);
    setTab("accounts");
  };

  return (
    <Screen edges={[]}>
      <PageHeader
        title="Chart of accounts"
        subtitle={groupTitle ? `Ledgers in ${groupTitle}` : "Groups and ledger accounts"}
        icon="list-outline"
        showBack
        onBack={() => navigation.goBack()}
        menuActions={[{ key: "refresh", label: "Refresh", onPress: () => void active.refresh() }]}
      />

      {rbacLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Chart of accounts is not available"
          hint="Your role cannot view ledgers in this workspace."
        />
      ) : (
        <View style={styles.body}>
          <View style={styles.tabs}>
            <TabButton
              label="Ledgers"
              selected={tab === "accounts"}
              onPress={() => setTab("accounts")}
            />
            <TabButton
              label="Groups"
              selected={tab === "groups"}
              onPress={() => setTab("groups")}
            />
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              placeholder={tab === "accounts" ? "Search ledger accounts" : "Search groups"}
              placeholderTextColor={colors.textPlaceholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {tab === "accounts" && groupTitle ? (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setGroupTitle(null)}
              accessibilityRole="button"
              accessibilityLabel={`Clear group filter ${groupTitle}`}
            >
              <Text style={styles.filterText} numberOfLines={1}>
                {groupTitle}
              </Text>
              <Ionicons name="close" size={14} color={colors.brand} />
            </TouchableOpacity>
          ) : null}

          {tab === "accounts" ? (
            <FlatList
              data={accounts.items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={accounts.refreshing}
                  onRefresh={() => void accounts.refresh()}
                  tintColor={colors.brand}
                />
              }
              onEndReached={() => void accounts.loadMore()}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                accounts.loadingMore ? <ActivityIndicator style={styles.footer} /> : null
              }
              ListEmptyComponent={
                accounts.loading ? (
                  <ActivityIndicator style={styles.footer} color={colors.brand} />
                ) : (
                  <EmptyState
                    icon={accounts.error ? "cloud-offline-outline" : "list-outline"}
                    title={accounts.error ? "Could not load ledgers" : "No ledger accounts"}
                    hint={
                      accounts.error ||
                      (query || groupTitle
                        ? "Try another name or clear the group filter."
                        : "Ledger accounts for this company will appear here.")
                    }
                  />
                )
              }
              renderItem={({ item }) => {
                const nature = ledgerNature(item);
                const code = item.statutory_code ? ` · ${item.statutory_code}` : "";
                return (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() =>
                      navigation.navigate("LedgerAccount", {
                        accountId: item.id,
                        title: item.title,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={2}>
                        {ledgerGroupPath(item.ledger_group)}
                        {nature ? ` · ${nature}` : ""}
                        {code}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <FlatList
              data={groups.items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={groups.refreshing}
                  onRefresh={() => void groups.refresh()}
                  tintColor={colors.brand}
                />
              }
              onEndReached={() => void groups.loadMore()}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                groups.loadingMore ? <ActivityIndicator style={styles.footer} /> : null
              }
              ListEmptyComponent={
                groups.loading ? (
                  <ActivityIndicator style={styles.footer} color={colors.brand} />
                ) : (
                  <EmptyState
                    icon={groups.error ? "cloud-offline-outline" : "folder-outline"}
                    title={groups.error ? "Could not load groups" : "No ledger groups"}
                    hint={groups.error || "Groups in the chart of accounts will appear here."}
                  />
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => openGroup(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ledgers in ${item.title}`}
                >
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.is_primary ? "Primary group" : ledgerGroupPath(item)}
                      {item.nature_of_group ? ` · ${item.nature_of_group}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.tab, selected && styles.tabSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
    </TouchableOpacity>
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
    tabs: {
      flexDirection: "row",
      marginHorizontal: space.lg,
      marginTop: space.md,
      padding: 4,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      gap: 4,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: radius.sm,
    },
    tabSelected: {
      backgroundColor: colors.surface,
    },
    tabLabel: {
      ...type.label,
      color: colors.textSecondary,
    },
    tabLabelSelected: {
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
    filterChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginHorizontal: space.lg,
      marginTop: space.sm,
      maxWidth: "90%",
      backgroundColor: colors.brandSoft,
      borderRadius: radius.full,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    filterText: {
      ...type.label,
      color: colors.brand,
      flexShrink: 1,
    },
    list: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.xxxl,
      flexGrow: 1,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space.lg,
      paddingVertical: 14,
      marginBottom: space.sm,
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
    footer: {
      marginVertical: space.lg,
    },
  };
}
