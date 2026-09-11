import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FRONTEND_URL } from "../../config/env";
import {
  SECTION_ICONS,
  WEB_ONLY_SECTIONS,
  WEB_PATHS,
  getSectionLabel,
} from "../../config/dashboard";
import { formatDate, formatDateTime } from "../../utils/dates";
import { formatInr } from "../../utils/money";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { CompleteDashboard, DashboardPerms, DashboardSecondary } from "../../types/dashboard";
import WidgetCard, { WidgetEmpty, WidgetSkeleton } from "./WidgetCard";
import type { IconName } from "../../config/features";

export type HomeNavigation = {
  openNotifications: () => void;
  openDocuments: () => void;
  openReports: (reportId?: "profit-and-loss" | "balance-sheet") => void;
  openQueue: () => void;
  openScanner: () => void;
  openApDocument: (id: string) => void;
};

type Props = {
  sections: string[];
  complete: CompleteDashboard | null;
  secondary: DashboardSecondary;
  perms: DashboardPerms;
  periodLabel: string;
  loading: boolean;
  unread: number;
  navigation: HomeNavigation;
};

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function nested(obj: unknown, key: string): Record<string, unknown> | null {
  return record(record(obj)?.[key]);
}

function openWeb(path: string) {
  const base = FRONTEND_URL.replace(/\/+$/, "");
  void Linking.openURL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
}

function ProgressBar({ value }: { value: number }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const width = Math.max(0, Math.min(100, value));
  const color = width >= 80 ? colors.success : width >= 56 ? colors.warning : colors.danger;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string; tone?: "up" | "down" | "muted" }[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.statCell}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text
            style={[
              styles.statValue,
              item.tone === "up" && styles.up,
              item.tone === "down" && styles.down,
            ]}
            numberOfLines={1}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WebWidget({ sectionId }: { sectionId: string }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const path = WEB_PATHS[sectionId] || "/";
  return (
    <WidgetCard title={getSectionLabel(sectionId)} icon={SECTION_ICONS[sectionId]}>
      <Text style={styles.webHint}>This tool is available in the web workspace.</Text>
      <TouchableOpacity style={styles.linkBtn} onPress={() => openWeb(path)}>
        <Text style={styles.linkText}>Open in web</Text>
        <Ionicons name="open-outline" size={14} color={colors.brand} />
      </TouchableOpacity>
    </WidgetCard>
  );
}

function PartyList({
  title,
  icon,
  parties,
  empty,
}: {
  title: string;
  icon: IconName;
  parties: { name: string; total?: number; count?: number }[];
  empty: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <WidgetCard title={title} icon={icon}>
      {parties.length === 0 ? (
        <WidgetEmpty text={empty} />
      ) : (
        parties.slice(0, 5).map((party) => (
          <View key={party.name} style={styles.listRow}>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {party.name}
              </Text>
              <Text style={styles.listMeta}>{party.count ?? 0} invoices</Text>
            </View>
            <Text style={styles.listAmount}>{formatInr(party.total, true)}</Text>
          </View>
        ))
      )}
    </WidgetCard>
  );
}

export default function DashboardFeed({
  sections,
  complete,
  secondary,
  perms,
  periodLabel,
  loading,
  unread,
  navigation,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (loading) {
    return (
      <View style={styles.stack}>
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </View>
    );
  }

  const visible = sections;

  const renderSection = (sectionId: string) => {
    if (WEB_ONLY_SECTIONS.has(sectionId)) {
      return <WebWidget sectionId={sectionId} />;
    }

    switch (sectionId) {
      case "notifications": {
        const items = secondary.notifications.data;
        return (
          <WidgetCard
            title={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
            icon="notifications-outline"
            onPress={navigation.openNotifications}
          >
            {items.length === 0 ? (
              <WidgetEmpty
                text={
                  unread > 0
                    ? "Open to read your unread notifications."
                    : "No recent notifications."
                }
              />
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {item.title || item.message || "Notification"}
                    </Text>
                    <Text style={styles.listMeta}>{formatDateTime(item.timestamp)}</Text>
                  </View>
                </View>
              ))
            )}
          </WidgetCard>
        );
      }
      case "actionInbox": {
        const items = secondary.actionItems.data;
        return (
          <WidgetCard title="Needs attention" icon="alert-circle-outline">
            {items.length === 0 ? (
              <WidgetEmpty text="You're all caught up. No urgent items right now." />
            ) : (
              items.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    {item.subtitle ? <Text style={styles.listMeta}>{item.subtitle}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </WidgetCard>
        );
      }

      case "quickActions": {
        const actions = [
          perms.canUpload
            ? {
                key: "scan",
                label: "Scan",
                icon: "scan-outline" as IconName,
                onPress: navigation.openScanner,
              }
            : null,
          perms.canViewApInsights
            ? {
                key: "docs",
                label: "Documents",
                icon: "documents-outline" as IconName,
                onPress: navigation.openDocuments,
              }
            : null,
          perms.canViewStatutoryReports
            ? {
                key: "pl",
                label: "P&L",
                icon: "bar-chart-outline" as IconName,
                onPress: () => navigation.openReports("profit-and-loss"),
              }
            : null,
          perms.canAccessDocProcessing
            ? {
                key: "queue",
                label: "Queue",
                icon: "hourglass-outline" as IconName,
                onPress: navigation.openQueue,
              }
            : null,
        ].filter(Boolean) as { key: string; label: string; icon: IconName; onPress: () => void }[];
        if (actions.length === 0) {
          return null;
        }
        return (
          <WidgetCard title="Quick actions" icon="flash-outline">
            <View style={styles.chips}>
              {actions.map((action) => (
                <TouchableOpacity key={action.key} style={styles.chip} onPress={action.onPress}>
                  <Ionicons name={action.icon} size={16} color={colors.brand} />
                  <Text style={styles.chipLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </WidgetCard>
        );
      }

      case "myWork": {
        const payload = secondary.myPendingApprovals.data;
        const items = payload?.items || [];
        const total = payload?.total ?? items.length;
        return (
          <WidgetCard
            title={total > 0 ? `My approvals (${total})` : "My approvals"}
            icon="checkmark-done-outline"
          >
            {items.length === 0 ? (
              <WidgetEmpty text="No invoices waiting for your approval." />
            ) : (
              items.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listRow}
                  onPress={() => navigation.openApDocument(item.id)}
                >
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {item.party_name || "Vendor"}
                    </Text>
                    <Text style={styles.listMeta}>
                      {item.invoice_number || "No invoice #"}
                      {item.waiting_days != null ? ` · ${item.waiting_days}d` : ""}
                    </Text>
                  </View>
                  <Text style={styles.listAmount}>{formatInr(item.amount, true)}</Text>
                </TouchableOpacity>
              ))
            )}
          </WidgetCard>
        );
      }

      case "cashPosition": {
        if (!perms.canViewBanking) {
          return null;
        }
        const accounts = secondary.bankAccounts.data;
        const total = accounts.reduce(
          (sum, acc) => sum + num(acc.current_balance ?? acc.opening_balance),
          0
        );
        return (
          <WidgetCard title="Cash position" icon="wallet-outline">
            {accounts.length === 0 ? (
              <WidgetEmpty text="No bank accounts connected." />
            ) : (
              <>
                <Text style={styles.hero}>{formatInr(total, true)}</Text>
                <Text style={styles.meta}>
                  Across {accounts.length} bank account{accounts.length === 1 ? "" : "s"}
                </Text>
                {accounts.slice(0, 5).map((acc) => (
                  <View key={acc.id} style={styles.listRow}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {acc.account_name || acc.bank_name || "Account"}
                      </Text>
                      <Text style={styles.listMeta}>
                        {[acc.bank_name, acc.account_type].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Text style={styles.listAmount}>
                      {formatInr(acc.current_balance ?? acc.opening_balance, true)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </WidgetCard>
        );
      }

      case "plSnapshot": {
        if (!perms.canViewStatutoryReports) {
          return null;
        }
        const data = secondary.plData.data;
        if (!data) {
          return (
            <WidgetCard title={`P&L snapshot (${periodLabel})`} icon="trending-up-outline">
              <WidgetEmpty text="P&L data unavailable." />
            </WidgetCard>
          );
        }
        const income = nested(data, "income");
        const expenses = nested(data, "expenses");
        const totalIncome = num(data.total_income ?? income?.total);
        const totalExpense = num(data.total_expense ?? expenses?.total);
        const net = num(data.net_profit ?? totalIncome - totalExpense);
        return (
          <WidgetCard
            title={`P&L snapshot (${periodLabel})`}
            icon="trending-up-outline"
            onPress={() => navigation.openReports("profit-and-loss")}
          >
            <StatGrid
              items={[
                { label: "Income", value: formatInr(totalIncome, true), tone: "up" },
                { label: "Expenses", value: formatInr(totalExpense, true), tone: "down" },
              ]}
            />
            <Text style={[styles.hero, { marginTop: 12 }, net >= 0 ? styles.up : styles.down]}>
              {formatInr(net, true)}
            </Text>
            <Text style={styles.meta}>Net profit / loss</Text>
          </WidgetCard>
        );
      }

      case "bankReconciliation": {
        if (!perms.canViewBanking) {
          return null;
        }
        const metrics = complete?.bank_reconciliation_metrics;
        if (!metrics) {
          return null;
        }
        const rate = num(metrics.reconciliation_rate);
        return (
          <WidgetCard title="Bank reconciliation" icon="git-compare-outline">
            <Text style={styles.hero}>{rate.toFixed(1)}%</Text>
            <Text style={styles.meta}>Reconciliation rate</Text>
            <ProgressBar value={rate} />
            <Text style={styles.meta}>
              {metrics.unreconciled_transactions ?? 0} unreconciled ·{" "}
              {metrics.total_transactions ?? 0} total
            </Text>
          </WidgetCard>
        );
      }

      case "balanceSheet": {
        if (!perms.canViewStatutoryReports) {
          return null;
        }
        const data = secondary.balanceSheet.data;
        if (!data || data.no_data) {
          return (
            <WidgetCard title="Balance sheet" icon="scale-outline">
              <WidgetEmpty text="No ledger data yet." />
            </WidgetCard>
          );
        }
        return (
          <WidgetCard
            title="Balance sheet"
            icon="scale-outline"
            onPress={() => navigation.openReports("balance-sheet")}
          >
            <StatGrid
              items={[
                { label: "Assets", value: formatInr(num(nested(data, "assets")?.total), true) },
                {
                  label: "Liabilities",
                  value: formatInr(num(nested(data, "liabilities")?.total), true),
                },
                { label: "Equity", value: formatInr(num(nested(data, "equity")?.total), true) },
              ]}
            />
          </WidgetCard>
        );
      }

      case "cashFlowTrend": {
        if (!perms.canViewBanking) {
          return null;
        }
        const data = secondary.cashFlowTrend.data;
        if (!data) {
          return (
            <WidgetCard title="Cash flow (30 days)" icon="swap-vertical-outline">
              <WidgetEmpty text="Cash flow data unavailable." />
            </WidgetCard>
          );
        }
        return (
          <WidgetCard title="Cash flow (30 days)" icon="swap-vertical-outline">
            <StatGrid
              items={[
                { label: "Inflow", value: formatInr(num(data.total_inflow), true), tone: "up" },
                { label: "Outflow", value: formatInr(num(data.total_outflow), true), tone: "down" },
                {
                  label: "Net",
                  value: formatInr(num(data.net), true),
                  tone: num(data.net) >= 0 ? "up" : "down",
                },
              ]}
            />
          </WidgetCard>
        );
      }

      case "workingCapital": {
        const data = secondary.workingCapital.data;
        if (!data) {
          return (
            <WidgetCard title="Working capital" icon="swap-horizontal-outline">
              <WidgetEmpty text="Working capital data unavailable." />
            </WidgetCard>
          );
        }
        return (
          <WidgetCard title="Working capital" icon="swap-horizontal-outline">
            <StatGrid
              items={[
                {
                  label: "AR outstanding",
                  value: formatInr(num(data.ar_outstanding), true),
                  tone: "up",
                },
                {
                  label: "AP outstanding",
                  value: formatInr(num(data.ap_outstanding), true),
                  tone: "down",
                },
                {
                  label: "Net AR − AP",
                  value: formatInr(num(data.net), true),
                  tone: num(data.net) >= 0 ? "up" : "down",
                },
              ]}
            />
          </WidgetCard>
        );
      }

      case "compliance": {
        const events = secondary.complianceEvents.data.slice(0, 5);
        return (
          <WidgetCard title="Compliance calendar" icon="calendar-outline">
            {events.length === 0 ? (
              <WidgetEmpty text="No upcoming compliance events in the next 90 days." />
            ) : (
              events.map((event) => (
                <View key={`${event.type}-${event.title}-${event.due_date}`} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{event.title}</Text>
                    <Text style={styles.listMeta}>{formatDate(event.due_date)}</Text>
                  </View>
                </View>
              ))
            )}
          </WidgetCard>
        );
      }

      case "tdsSummary": {
        if (!perms.canViewTds) {
          return null;
        }
        const data = secondary.tdsSummary.data;
        const sectionsList = Array.isArray(data?.sections)
          ? (data?.sections as { section: string; amount: number }[])
          : [];
        return (
          <WidgetCard title={`TDS deducted (${periodLabel})`} icon="calculator-outline">
            {!data ? (
              <WidgetEmpty text="TDS summary unavailable." />
            ) : (
              <>
                <Text style={styles.hero}>{formatInr(num(data.total_tds), true)}</Text>
                <Text style={styles.meta}>
                  From {num(data.document_count)} approved document
                  {num(data.document_count) === 1 ? "" : "s"}
                </Text>
                {sectionsList.slice(0, 4).map((row) => (
                  <View key={row.section} style={styles.listRow}>
                    <Text style={styles.listTitle}>{row.section}</Text>
                    <Text style={styles.listAmount}>{formatInr(row.amount, true)}</Text>
                  </View>
                ))}
              </>
            )}
          </WidgetCard>
        );
      }

      case "priorYearBenchmark": {
        const data = secondary.priorYearBenchmark.data;
        return (
          <WidgetCard title="Prior year benchmark" icon="analytics-outline">
            {!data ? (
              <WidgetEmpty text="Benchmark data unavailable." />
            ) : (
              <>
                <Text style={styles.hero}>{formatInr(num(data.current_net_profit), true)}</Text>
                <Text style={styles.meta}>Net profit (FY to date)</Text>
                <StatGrid
                  items={[
                    {
                      label: "Same period last FY",
                      value: formatInr(num(data.prior_ytd_net_profit), true),
                    },
                    {
                      label: data.prior_fy_label ? String(data.prior_fy_label) : "Prior FY",
                      value: formatInr(num(data.prior_full_fy_net_profit), true),
                    },
                  ]}
                />
              </>
            )}
          </WidgetCard>
        );
      }

      case "inventorySummary": {
        const data = secondary.inventorySummary.data;
        if (!data || data.enabled === false) {
          return null;
        }
        return (
          <WidgetCard title="Inventory snapshot" icon="cube-outline">
            <StatGrid
              items={[
                { label: "Active SKUs", value: String(num(data.active_items)) },
                { label: "Low stock", value: String(num(data.low_stock_batches)), tone: "down" },
                { label: "Out of stock", value: String(num(data.out_of_stock_batches)) },
              ]}
            />
          </WidgetCard>
        );
      }

      case "operations": {
        if (!perms.canAccessDocProcessing) {
          return null;
        }
        const ap = complete?.document_processing_metrics?.ap_docs;
        const ar = complete?.document_processing_metrics?.ar_docs;
        const processed = num(ap?.total_processed) + num(ar?.total_processed);
        const stats = secondary.processingStats.data;
        const email = num(ap?.email_received);
        const upload = num(ap?.uploaded);
        const manual = num(ap?.manually_created);
        const sourceTotal = email + upload + manual;
        return (
          <WidgetCard
            title="Document processing"
            icon="documents-outline"
            onPress={navigation.openQueue}
          >
            <StatGrid
              items={[
                { label: "Processed", value: String(processed) },
                {
                  label: "Approval rate",
                  value: `${num(complete?.approval_workflow_metrics?.approval_rate).toFixed(0)}%`,
                },
                {
                  label: "Automation",
                  value: `${num(complete?.automation_efficiency_metrics?.automation_rate).toFixed(0)}%`,
                },
              ]}
            />
            {stats ? (
              <Text style={styles.meta}>
                Queue · {num(stats.processing)} processing · {num(stats.failed)} failed
              </Text>
            ) : null}
            {sourceTotal > 0 ? (
              <View style={styles.nestedBlock}>
                <StatGrid
                  items={[
                    { label: "Email", value: String(email) },
                    { label: "Upload", value: String(upload) },
                    { label: "Manual", value: String(manual) },
                  ]}
                />
              </View>
            ) : null}
          </WidgetCard>
        );
      }

      case "topVendors":
        if (!perms.canViewApInsights) {
          return null;
        }
        return (
          <PartyList
            title="Top vendors by spend"
            icon="storefront-outline"
            parties={secondary.topVendors.data}
            empty="No vendor spend data yet."
          />
        );

      case "topCustomers":
        if (!perms.canViewArInsights) {
          return null;
        }
        return (
          <PartyList
            title="Top customers by revenue"
            icon="people-outline"
            parties={secondary.topCustomers.data}
            empty="No customer revenue data yet."
          />
        );

      case "sync": {
        const pending = num(secondary.erpSync.data?.pending_count ?? secondary.erpSync.data?.count);
        return (
          <WidgetCard title="ERP sync" icon="sync-outline">
            <Text style={styles.hero}>{pending > 0 ? `${pending} pending` : "Up to date"}</Text>
            <Text style={styles.meta}>
              {pending > 0 ? "Items waiting in the sync queue" : "No pending sync jobs"}
            </Text>
          </WidgetCard>
        );
      }

      case "aiAccuracy": {
        const stats = secondary.recommendationStats.data;
        const nestedStats = nested(stats, "statistics");
        const rate = num(stats?.acceptance_rate ?? nestedStats?.accuracy_percentage);
        return (
          <WidgetCard title="AI ledger accuracy" icon="sparkles-outline">
            {!stats ? (
              <WidgetEmpty text="Recommendation data unavailable." />
            ) : (
              <>
                <Text style={styles.hero}>{rate.toFixed(1)}%</Text>
                <Text style={styles.meta}>Acceptance rate</Text>
                <ProgressBar value={rate} />
              </>
            )}
          </WidgetCard>
        );
      }

      case "activityFeed": {
        const items = secondary.userActivity.data.slice(0, 5);
        return (
          <WidgetCard title="Recent activity" icon="time-outline">
            {items.length === 0 ? (
              <WidgetEmpty text="No recent activity." />
            ) : (
              items.map((item, index) => (
                <View key={item.id || `${item.timestamp}-${index}`} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {item.username || "User"} · {item.action || "update"}
                    </Text>
                    <Text style={styles.listMeta} numberOfLines={2}>
                      {item.description || item.object_repr || item.model || ""}
                    </Text>
                  </View>
                  <Text style={styles.listMeta}>{formatDateTime(item.timestamp)}</Text>
                </View>
              ))
            )}
          </WidgetCard>
        );
      }

      case "team": {
        const metrics = complete?.user_activity_metrics;
        if (!metrics) {
          return null;
        }
        const top = metrics.top_users || [];
        return (
          <WidgetCard title="Team activity" icon="people-circle-outline">
            <StatGrid
              items={[
                { label: "Active users", value: String(metrics.active_users ?? 0) },
                { label: "Team size", value: String(metrics.team_size ?? 0) },
                {
                  label: "Active today",
                  value: String(complete?.real_time_stats?.active_users_today ?? 0),
                },
              ]}
            />
            {top.slice(0, 3).map((user, index) => {
              const name =
                [user.user__first_name, user.user__last_name].filter(Boolean).join(" ") || "User";
              return (
                <View key={`${name}-${index}`} style={styles.listRow}>
                  <Text style={styles.listTitle}>{name}</Text>
                  <Text style={styles.listMeta}>{user.activity_count ?? 0} actions</Text>
                </View>
              );
            })}
          </WidgetCard>
        );
      }

      case "ledger": {
        if (!perms.canViewGlList) {
          return null;
        }
        const entries = secondary.recentJE.data;
        return (
          <WidgetCard title="Recent journal entries" icon="book-outline">
            {entries.length === 0 ? (
              <WidgetEmpty text="No recent journal entries." />
            ) : (
              entries.map((entry) => (
                <View key={entry.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {entry.voucher_number || "Journal"}
                    </Text>
                    <Text style={styles.listMeta} numberOfLines={1}>
                      {formatDate(entry.date)} · {entry.post_status || "draft"}
                    </Text>
                  </View>
                  <Text style={styles.listAmount}>{formatInr(entry.total_debit, true)}</Text>
                </View>
              ))
            )}
          </WidgetCard>
        );
      }

      default:
        return null;
    }
  };

  const nodes = visible
    .map((sectionId) => {
      const node = renderSection(sectionId);
      return node ? <View key={sectionId}>{node}</View> : null;
    })
    .filter(Boolean);

  if (nodes.length === 0) {
    return (
      <WidgetCard title="Your dashboard" icon="grid-outline">
        <WidgetEmpty text="Turn on widgets with Customize on this screen." />
      </WidgetCard>
    );
  }

  return <View style={styles.stack}>{nodes}</View>;
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    stack: {
      gap: space.md,
    },
    hero: {
      ...type.numericLg,
      fontSize: 26,
      lineHeight: 32,
    },
    meta: {
      ...type.caption,
      marginTop: 4,
      color: colors.textSecondary,
    },
    nestedBlock: {
      marginTop: 12,
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceMuted,
      marginTop: 10,
      marginBottom: 8,
      overflow: "hidden",
    },
    fill: {
      height: 6,
      borderRadius: 3,
    },
    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    statCell: {
      flexGrow: 1,
      flexBasis: "30%",
      minWidth: 88,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    statLabel: {
      ...type.overline,
      marginBottom: 4,
    },
    statValue: {
      ...type.cardTitle,
    },
    up: {
      color: colors.success,
    },
    down: {
      color: colors.danger,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    listCopy: {
      flex: 1,
      minWidth: 0,
    },
    listTitle: {
      ...type.label,
      color: colors.textHeading,
    },
    listMeta: {
      ...type.overline,
      marginTop: 2,
      color: colors.textSecondary,
      letterSpacing: 0,
    },
    listAmount: {
      ...type.label,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.brandSoft,
      borderRadius: radius.full,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    chipLabel: {
      ...type.label,
      color: colors.brand,
    },
    webHint: {
      ...type.meta,
      marginBottom: 10,
    },
    linkBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    linkText: {
      ...type.label,
      color: colors.brand,
    },
  };
}
