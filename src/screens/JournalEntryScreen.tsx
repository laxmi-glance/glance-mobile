import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import { useRbac } from "../hooks/useRbac";
import accountingService from "../services/accounting.service";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";
import type { JournalEntryDetail, JournalLineDetail } from "../types/accounting";
import type { RootStackParamList } from "../types/navigation";
import {
  formatSideAmount,
  postingStatusLabel,
  postingStatusTone,
  voucherLabel,
} from "../utils/accounting";
import { formatDate } from "../utils/dates";
import { formatInr } from "../utils/money";

type Props = NativeStackScreenProps<RootStackParamList, "JournalEntry">;

export default function JournalEntryScreen({ navigation, route }: Props) {
  const { entryId } = route.params;
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { allows, loading: rbacLoading } = useRbac();
  const canView = allows("gl", "view");
  const canOpenLedger = allows("ledger", "view");
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntry(await accountingService.getJournalEntry(entryId));
    } catch {
      setError("Could not load this journal entry.");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    if (rbacLoading || !canView) {
      return;
    }
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- load journal entry after permission check
  }, [canView, load, rbacLoading]);

  const lines = [...(entry?.lines || [])].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0)
  );

  return (
    <Screen edges={[]}>
      <PageHeader
        title={entry ? voucherLabel(entry) : "Journal entry"}
        subtitle={entry?.date ? formatDate(entry.date) : "Voucher"}
        icon="document-text-outline"
        showBack
        onBack={() => navigation.goBack()}
      />

      {rbacLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="This journal entry is not available"
          hint="Your role cannot view the general ledger in this workspace."
        />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error || !entry ? (
        <View style={styles.center}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load entry"
            hint={error || ""}
          />
          <Button label="Try again" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <StatusBadge
                label={postingStatusLabel(entry.post_status)}
                tone={postingStatusTone(entry.post_status)}
              />
              {entry.is_balanced === false ? (
                <Text style={styles.unbalanced}>Unbalanced</Text>
              ) : null}
            </View>
            {entry.narration ? <Text style={styles.narration}>{entry.narration}</Text> : null}
            <View style={styles.totals}>
              <Total label="Debit" value={formatInr(entry.total_debit)} />
              <Total label="Credit" value={formatInr(entry.total_credit)} />
            </View>
          </View>

          <Text style={styles.section}>Lines</Text>
          {lines.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title="No lines"
              hint="This voucher has no journal lines."
            />
          ) : (
            lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                canOpen={canOpenLedger && Boolean(line.account?.id)}
                onPress={() => {
                  if (line.account?.id) {
                    navigation.navigate("LedgerAccount", {
                      accountId: line.account.id,
                      title: line.account.title || undefined,
                    });
                  }
                }}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

function LineRow({
  line,
  canOpen,
  onPress,
}: {
  line: JournalLineDetail;
  canOpen: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const title = line.account?.title || "Unknown ledger";
  const body = (
    <>
      <View style={styles.lineCopy}>
        <Text style={styles.lineTitle}>{title}</Text>
        {line.line_narration ? <Text style={styles.lineMeta}>{line.line_narration}</Text> : null}
        {line.account?.statutory_code ? (
          <Text style={styles.lineMeta}>{line.account.statutory_code}</Text>
        ) : null}
      </View>
      <View style={styles.lineAmounts}>
        <View style={styles.lineAmountCol}>
          <Text style={styles.lineMeta}>Debit</Text>
          <Text style={styles.lineAmount}>{formatSideAmount(line.debit_amount)}</Text>
        </View>
        <View style={styles.lineAmountCol}>
          <Text style={styles.lineMeta}>Credit</Text>
          <Text style={styles.lineAmount}>{formatSideAmount(line.credit_amount)}</Text>
        </View>
      </View>
    </>
  );

  if (!canOpen) {
    return <View style={styles.line}>{body}</View>;
  }

  return (
    <TouchableOpacity style={styles.line} onPress={onPress} accessibilityRole="button">
      {body}
      <Text style={[styles.openHint, { color: colors.brand }]}>View ledger</Text>
    </TouchableOpacity>
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
    content: {
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: 40,
    },
    summary: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    unbalanced: {
      ...type.overline,
      color: colors.danger,
    },
    narration: {
      ...type.body,
      marginTop: space.md,
    },
    totals: {
      flexDirection: "row",
      gap: space.md,
      marginTop: space.lg,
    },
    total: {
      flex: 1,
    },
    totalLabel: {
      ...type.overline,
      textTransform: "uppercase",
    },
    totalValue: {
      ...type.heading,
      marginTop: 4,
    },
    section: {
      ...type.overline,
      textTransform: "uppercase",
      marginTop: space.lg,
      marginBottom: space.sm,
    },
    line: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      marginBottom: space.sm,
    },
    lineCopy: {
      marginBottom: space.sm,
    },
    lineTitle: {
      ...type.subtitle,
    },
    lineMeta: {
      ...type.meta,
      marginTop: 2,
    },
    lineAmounts: {
      flexDirection: "row",
      gap: space.md,
    },
    lineAmountCol: {
      flex: 1,
    },
    lineAmount: {
      ...type.label,
      marginTop: 2,
    },
    openHint: {
      ...type.overline,
      marginTop: space.sm,
    },
  };
}
