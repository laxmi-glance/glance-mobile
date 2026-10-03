import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiErrorMessage } from "../../utils/errors";
import {
  buildBalanceSheetModel,
  buildGroupSummaryModel,
  buildProfitAndLossModel,
  buildTrialBalanceModel,
  collectExpandableIds,
  filterReportNodes,
} from "../../utils/reportLayout";
import reportsService from "../../services/reports.service";
import { useReportRange } from "../../hooks/useReportRange";
import ReportPeriodBar from "./ReportPeriodBar";
import ReportTree from "./ReportTree";
import Button from "../Button";
import EmptyState from "../EmptyState";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { FinancialReportModel, ReportFigure } from "../../types/reports";
import type { ReportId } from "../../config/reports";

type FinancialReportId = Extract<
  ReportId,
  "profit-and-loss" | "balance-sheet" | "trial-balance" | "group-summary"
>;

type Props = {
  reportId: FinancialReportId;
};

const EMPTY_COPY: Record<FinancialReportId, string> = {
  "profit-and-loss": "No income or expense activity in this period.",
  "balance-sheet": "No balances to show for this date.",
  "trial-balance": "No ledger balances in this period.",
  "group-summary": "No account groups in this period.",
};

export default function FinancialReport({ reportId }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const dateMode = reportId === "balance-sheet" ? "date" : "range";
  const { range, presets, setRange, ready } = useReportRange(dateMode);
  const [search, setSearch] = useState("");
  const [model, setModel] = useState<FinancialReportModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const requestRef = useRef(0);

  const load = useCallback(
    async (mode: "load" | "refresh") => {
      const requestId = ++requestRef.current;
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
        setModel(null);
      }
      try {
        const next =
          reportId === "profit-and-loss"
            ? buildProfitAndLossModel(
                await reportsService.getProfitAndLoss(range.startDate, range.endDate)
              )
            : reportId === "balance-sheet"
              ? buildBalanceSheetModel(await reportsService.getBalanceSheet(range.endDate))
              : reportId === "group-summary"
                ? buildGroupSummaryModel(
                    await reportsService.getTrialBalance(range.startDate, range.endDate)
                  )
                : buildTrialBalanceModel(
                    await reportsService.getTrialBalance(range.startDate, range.endDate)
                  );
        if (requestId !== requestRef.current) {
          return;
        }
        setModel(next);
        setExpanded({});
        setError(null);
      } catch (err) {
        if (requestId !== requestRef.current) {
          return;
        }
        setError(apiErrorMessage(err, "Unable to load this report."));
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range.endDate, range.startDate, reportId]
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    void load("load"); // eslint-disable-line react-hooks/set-state-in-effect -- load report after async API call
  }, [load, ready]);

  const nodes = useMemo(
    () => filterReportNodes(model?.nodes || [], search),
    [model?.nodes, search]
  );
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);
  const allOpen = expandableIds.length > 0 && expandableIds.every((id) => expanded[id]);

  const toggle = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleAll = () => {
    if (allOpen) {
      setExpanded({});
      return;
    }
    const next: Record<string, boolean> = {};
    expandableIds.forEach((id) => {
      next[id] = true;
    });
    setExpanded(next);
  };

  return (
    <View style={styles.flex}>
      <ReportPeriodBar
        mode={dateMode}
        range={range}
        presets={presets}
        onRangeChange={setRange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ledgers and groups"
      />
      {!ready || (loading && !model) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
              tintColor={colors.brand}
            />
          }
        >
          {error ? (
            <View style={styles.errorBlock}>
              <EmptyState icon="cloud-offline-outline" title="Could not load report" hint={error} />
              <Button label="Try again" onPress={() => void load("load")} />
            </View>
          ) : null}

          {model && !error ? (
            <>
              {model.figures.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.figures}
                >
                  {model.figures.map((item) => (
                    <FigureChip key={item.id} figure={item} />
                  ))}
                </ScrollView>
              ) : null}

              {model.notices.map((notice) => (
                <View key={notice} style={styles.notice}>
                  <Text style={styles.noticeText}>{notice}</Text>
                </View>
              ))}

              {expandableIds.length ? (
                <TouchableOpacity onPress={toggleAll} style={styles.expand}>
                  <Text style={styles.expandText}>
                    {allOpen ? "Collapse groups" : "Expand groups"}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {nodes.length ? (
                <ReportTree
                  nodes={nodes}
                  expanded={expanded}
                  onToggle={toggle}
                  forceExpand={search.trim().length > 0}
                />
              ) : (
                <EmptyState
                  icon="bar-chart-outline"
                  title={search.trim() ? "No matching rows" : "Nothing to show"}
                  hint={search.trim() ? "Try another ledger or group name." : EMPTY_COPY[reportId]}
                />
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function FigureChip({ figure }: { figure: ReportFigure }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.figure}>
      <Text
        style={[
          styles.figureValue,
          figure.tone === "success" && styles.good,
          figure.tone === "danger" && styles.bad,
        ]}
        numberOfLines={1}
      >
        {figure.value}
      </Text>
      <Text style={styles.figureLabel}>{figure.label}</Text>
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    flex: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    content: {
      padding: space.lg,
      paddingTop: space.md,
      gap: space.md,
      paddingBottom: 40,
    },
    figures: {
      gap: space.sm,
    },
    figure: {
      minWidth: 132,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    figureValue: {
      ...type.cardTitle,
    },
    figureLabel: {
      ...type.caption,
      marginTop: 2,
    },
    good: {
      color: colors.success,
    },
    bad: {
      color: colors.danger,
    },
    notice: {
      backgroundColor: colors.warningSoft,
      borderRadius: radius.md,
      padding: space.md,
    },
    noticeText: {
      ...type.meta,
      color: colors.text,
    },
    expand: {
      alignSelf: "flex-end" as const,
    },
    expandText: {
      ...type.label,
      color: colors.brand,
    },
    errorBlock: {
      gap: space.md,
    },
  };
}
