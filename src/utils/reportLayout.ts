import { formatInr, humanizeKey } from "./money";
import type {
  ActivityChangeRow,
  BalanceSheetReport,
  BalanceSheetSection,
  FinancialReportModel,
  ProfitAndLossReport,
  ProfitLossBucket,
  ProfitLossGroup,
  ProfitLossLine,
  ReportFigure,
  ReportNode,
  ReportNoticeSource,
  TrialBalanceLine,
  TrialBalanceReport,
} from "../types/reports";

const EMPTY = "—";

export function toAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function isSignificant(value: number): boolean {
  return Math.abs(value) >= 0.005;
}

export function formatDrCr(debit?: number | null, credit?: number | null): string {
  const dr = Math.abs(toAmount(debit));
  const cr = Math.abs(toAmount(credit));
  const hasDebit = dr >= 0.005;
  const hasCredit = cr >= 0.005;
  if (!hasDebit && !hasCredit) {
    return EMPTY;
  }
  if (hasDebit && hasCredit) {
    return `${formatInr(dr)} Dr · ${formatInr(cr)} Cr`;
  }
  return hasDebit ? `${formatInr(dr)} Dr` : `${formatInr(cr)} Cr`;
}

export function formatSignedAmount(value?: number | null): string {
  if (value == null || Number.isNaN(toAmount(value))) {
    return EMPTY;
  }
  const amount = toAmount(value);
  if (!isSignificant(amount)) {
    return formatInr(0);
  }
  if (amount < 0) {
    return `-${formatInr(Math.abs(amount))}`;
  }
  return formatInr(amount);
}

export function formatReportAmount(
  node: Pick<ReportNode, "mode" | "amount" | "debit" | "credit">
): string {
  if (node.mode === "drcr") {
    return formatDrCr(node.debit, node.credit);
  }
  return formatSignedAmount(node.amount);
}

export function movementCaption(node: ReportNode): string | null {
  const opening = formatDrCr(node.openingDebit, node.openingCredit);
  const period = formatDrCr(node.periodDebit, node.periodCredit);
  if (opening === EMPTY && period === EMPTY) {
    return null;
  }
  return `Opening ${opening} · Period ${period}`;
}

function node(
  partial: Partial<ReportNode> & Pick<ReportNode, "id" | "kind" | "label">
): ReportNode {
  return {
    amount: null,
    debit: null,
    credit: null,
    mode: "signed",
    openingDebit: null,
    openingCredit: null,
    periodDebit: null,
    periodCredit: null,
    children: [],
    ...partial,
  };
}

function normalizeName(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function reportNotices(source?: ReportNoticeSource | null): string[] {
  if (!source) {
    return [];
  }
  const notices: string[] = [];
  const health = source.opening_balance_health;
  if (health && health.healthy === false && health.message) {
    notices.push(health.message);
  }
  for (const warning of source.data_integrity_warnings || []) {
    const text = warning.message || warning.title;
    if (text) {
      notices.push(text);
    }
  }
  return notices.slice(0, 4);
}

function figure(
  id: string,
  label: string,
  value: string,
  tone: ReportFigure["tone"] = "neutral"
): ReportFigure {
  return { id, label, value, tone };
}

type PlBuckets = {
  sales: Map<string, ProfitLossGroup>;
  directIncome: Map<string, ProfitLossGroup>;
  indirectIncome: Map<string, ProfitLossGroup>;
  purchase: Map<string, ProfitLossGroup>;
  directExpense: Map<string, ProfitLossGroup>;
  indirectExpense: Map<string, ProfitLossGroup>;
};

function classifyIncome(
  item: ProfitLossLine,
  hint: "direct" | "indirect" = "direct"
): "sales" | "directIncome" | "indirectIncome" {
  const primary = normalizeName(
    item.primary_group_name || item.top_group_name || item.group_name || item.ledger_group_name
  );
  const account = normalizeName(item.account_name);
  if (account === "closing stock" || primary.includes("closing stock")) {
    return "directIncome";
  }
  if (primary.includes("indirect income")) {
    return "indirectIncome";
  }
  if (primary.includes("sales")) {
    return "sales";
  }
  if (primary.includes("direct income")) {
    return "directIncome";
  }
  return hint === "indirect" ? "indirectIncome" : "directIncome";
}

function classifyExpense(
  item: ProfitLossLine,
  hint: "direct" | "indirect" = "indirect"
): "purchase" | "directExpense" | "indirectExpense" {
  const primary = normalizeName(
    item.primary_group_name || item.top_group_name || item.group_name || item.ledger_group_name
  );
  const account = normalizeName(item.account_name);
  if (account === "opening stock" || primary.includes("opening stock")) {
    return "directExpense";
  }
  if (primary.includes("indirect expense")) {
    return "indirectExpense";
  }
  if (primary.includes("purchase")) {
    return "purchase";
  }
  if (
    primary.includes("direct expense") ||
    primary.includes("cost of goods") ||
    primary.includes("cost of sales") ||
    primary === "cogs"
  ) {
    return "directExpense";
  }
  return hint === "direct" ? "directExpense" : "indirectExpense";
}

function addPlItem(
  bucket: Map<string, ProfitLossGroup>,
  item: ProfitLossLine,
  fallbackGroup: string
) {
  const groupName =
    item.sub_group_name ||
    item.ledger_group_name ||
    item.group_name ||
    fallbackGroup ||
    "Ungrouped";
  const key = normalizeName(groupName);
  const current = bucket.get(key) || {
    group_name: groupName,
    group_id: item.ledger_group_id || item.group_id || groupName,
    items: [],
    subtotal: 0,
  };
  current.items = [...(current.items || []), item];
  current.subtotal = toAmount(current.subtotal) + toAmount(item.line_total);
  bucket.set(key, current);
}

function collectProfitLossBuckets(report: ProfitAndLossReport): PlBuckets | null {
  const income = report.income;
  const expenses = report.expenses;
  const detailed = Boolean(
    income?.operating_income ||
    income?.other_income ||
    expenses?.cost_of_goods_sold ||
    expenses?.operating_expenses ||
    expenses?.other_expenses
  );
  if (!detailed) {
    return null;
  }

  const buckets: PlBuckets = {
    sales: new Map(),
    directIncome: new Map(),
    indirectIncome: new Map(),
    purchase: new Map(),
    directExpense: new Map(),
    indirectExpense: new Map(),
  };

  const takeIncome = (groups: ProfitLossGroup[] | undefined, hint: "direct" | "indirect") => {
    for (const group of groups || []) {
      for (const item of group.items || []) {
        addPlItem(buckets[classifyIncome(item, hint)], item, group.group_name || "Income");
      }
    }
  };
  const takeExpense = (groups: ProfitLossGroup[] | undefined, hint: "direct" | "indirect") => {
    for (const group of groups || []) {
      for (const item of group.items || []) {
        addPlItem(buckets[classifyExpense(item, hint)], item, group.group_name || "Expenses");
      }
    }
  };

  takeIncome(income?.operating_income?.groups, "direct");
  takeIncome(income?.other_income?.groups, "indirect");
  takeExpense(expenses?.cost_of_goods_sold?.groups, "direct");
  takeExpense(expenses?.operating_expenses?.groups, "indirect");
  takeExpense(expenses?.other_expenses?.groups, "indirect");
  return buckets;
}

function accountNodes(items: ProfitLossLine[] | undefined, prefix: string): ReportNode[] {
  return (items || [])
    .filter((item) => isSignificant(toAmount(item.line_total)))
    .map((item, index) =>
      node({
        id: `${prefix}:${item.account_id || item.account_name || index}`,
        kind: "account",
        label: item.account_name || "Ledger",
        amount: toAmount(item.line_total),
      })
    );
}

function subgroupNodes(groups: ProfitLossGroup[], prefix: string): ReportNode[] {
  return groups
    .map((group) => {
      const children = accountNodes(group.items, `${prefix}:${group.group_id || group.group_name}`);
      const amount = children.reduce((sum, child) => sum + toAmount(child.amount), 0);
      if (!children.length && !isSignificant(amount)) {
        return null;
      }
      return node({
        id: `${prefix}:group:${group.group_id || group.group_name}`,
        kind: "group",
        label: group.group_name || "Group",
        amount,
        children,
      });
    })
    .filter((group): group is ReportNode => Boolean(group))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function statementGroup(id: string, label: string, groups: ProfitLossGroup[]): ReportNode | null {
  const children = subgroupNodes(groups, id);
  const amount = children.reduce((sum, child) => sum + toAmount(child.amount), 0);
  if (!children.length && !isSignificant(amount)) {
    return null;
  }
  if (children.length === 1 && normalizeName(children[0].label) === normalizeName(label)) {
    return node({
      id,
      kind: "group",
      label,
      amount,
      children: children[0].children,
    });
  }
  return node({ id, kind: "group", label, amount, children });
}

function resultNode(
  id: string,
  profitLabel: string,
  lossLabel: string,
  value: number
): ReportNode | null {
  if (!isSignificant(value)) {
    return null;
  }
  return node({
    id,
    kind: "result",
    label: value > 0 ? profitLabel : lossLabel,
    amount: Math.abs(value),
  });
}

function simpleLines(bucket?: ProfitLossBucket): ReportNode[] {
  return accountNodes(bucket?.items, "simple");
}

export function buildProfitAndLossModel(report: ProfitAndLossReport): FinancialReportModel {
  const incomeTotal = toAmount(report.income?.total);
  const expenseTotal = toAmount(report.expenses?.total);
  const netProfit = toAmount(report.net_profit);
  const buckets = collectProfitLossBuckets(report);
  const nodes: ReportNode[] = [];

  if (buckets) {
    const purchase = [...buckets.purchase.values()];
    const directExpense = [...buckets.directExpense.values()];
    const sales = [...buckets.sales.values()];
    const directIncome = [...buckets.directIncome.values()];
    const indirectExpense = [...buckets.indirectExpense.values()];
    const indirectIncome = [...buckets.indirectIncome.values()];
    const sumGroups = (groups: ProfitLossGroup[]) =>
      groups.reduce((sum, group) => sum + toAmount(group.subtotal), 0);
    const gross =
      sumGroups(sales) + sumGroups(directIncome) - (sumGroups(purchase) + sumGroups(directExpense));

    const trading = [
      statementGroup("purchase", "Purchase Accounts", purchase),
      statementGroup("direct-expense", "Direct Expenses", directExpense),
      statementGroup("sales", "Sales Accounts", sales),
      statementGroup("direct-income", "Direct Incomes", directIncome),
      resultNode("gross", "Gross Profit", "Gross Loss", gross),
    ].filter((row): row is ReportNode => Boolean(row));

    const statement = [
      statementGroup("indirect-expense", "Indirect Expenses", indirectExpense),
      statementGroup("indirect-income", "Indirect Incomes", indirectIncome),
      resultNode("nett", "Nett Profit", "Nett Loss", netProfit),
    ].filter((row): row is ReportNode => Boolean(row));

    if (trading.length) {
      nodes.push(
        node({ id: "trading", kind: "section", label: "Trading account", children: trading })
      );
    }
    if (statement.length) {
      nodes.push(
        node({ id: "statement", kind: "section", label: "Income statement", children: statement })
      );
    }
  } else {
    const income = simpleLines(report.income);
    const expenses = simpleLines(report.expenses);
    if (income.length || isSignificant(incomeTotal)) {
      nodes.push(
        node({
          id: "income",
          kind: "section",
          label: "Income",
          children: [
            node({
              id: "income-total",
              kind: "group",
              label: "Income",
              amount: incomeTotal,
              children: income,
            }),
          ],
        })
      );
    }
    if (expenses.length || isSignificant(expenseTotal)) {
      nodes.push(
        node({
          id: "expenses",
          kind: "section",
          label: "Expenses",
          children: [
            node({
              id: "expense-total",
              kind: "group",
              label: "Expenses",
              amount: expenseTotal,
              children: expenses,
            }),
          ],
        })
      );
    }
    const nett = resultNode("nett", "Nett Profit", "Nett Loss", netProfit);
    if (nett) {
      nodes.push(nett);
    }
  }

  return {
    figures: [
      figure("income", "Income", formatInr(incomeTotal)),
      figure("expenses", "Expenses", formatInr(expenseTotal)),
      figure(
        "net",
        netProfit < 0 ? "Nett loss" : "Nett profit",
        formatInr(Math.abs(netProfit)),
        netProfit < 0 ? "danger" : isSignificant(netProfit) ? "success" : "neutral"
      ),
    ],
    nodes,
    notices: reportNotices(report),
    balanced: null,
  };
}

function sectionLines(section?: BalanceSheetSection): ReportNode[] {
  if (section?.groups?.length) {
    return section.groups
      .map((group, index) => {
        const children = (group.items || [])
          .filter((item) => isSignificant(toAmount(item.line_total)))
          .map((item, itemIndex) =>
            node({
              id: `bs:${group.group_id || group.group_name}:${item.account_id || itemIndex}`,
              kind: "account",
              label: item.account_name || "Ledger",
              amount: toAmount(item.line_total),
            })
          );
        const amount = toAmount(group.subtotal);
        if (!children.length && !isSignificant(amount)) {
          return null;
        }
        return node({
          id: `bs-group:${group.group_id || group.group_name || index}`,
          kind: "group",
          label: group.group_name || "Group",
          amount,
          children,
        });
      })
      .filter((group): group is ReportNode => Boolean(group))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  return (section?.items || [])
    .filter((item) => isSignificant(toAmount(item.line_total)))
    .map((item, index) =>
      node({
        id: `bs-item:${item.account_id || index}`,
        kind: "account",
        label: item.account_name || "Ledger",
        amount: toAmount(item.line_total),
      })
    );
}

function balanceSection(
  id: string,
  label: string,
  section: BalanceSheetSection | undefined,
  extra: ReportNode[] = []
): ReportNode | null {
  const children = [...sectionLines(section), ...extra];
  const total = toAmount(section?.total);
  if (!children.length && !isSignificant(total)) {
    return null;
  }
  const rows = [...children];
  if (isSignificant(total) || children.length) {
    rows.push(
      node({
        id: `${id}-total`,
        kind: "total",
        label: `Total ${label.toLowerCase()}`,
        amount: total,
      })
    );
  }
  return node({ id, kind: "section", label, children: rows });
}

export function buildBalanceSheetModel(report: BalanceSheetReport): FinancialReportModel {
  if (report.no_data) {
    return {
      figures: [],
      nodes: [],
      notices: ["No journal entries are available for this workspace yet."],
      balanced: null,
    };
  }

  const pl = report.profit_and_loss;
  const plTotal = toAmount(pl?.total);
  const plNodes: ReportNode[] = [];
  if (pl && isSignificant(plTotal)) {
    const children = [
      isSignificant(toAmount(pl.opening_balance))
        ? node({
            id: "pl-opening",
            kind: "account",
            label: "Opening balance",
            amount: toAmount(pl.opening_balance),
          })
        : null,
      isSignificant(toAmount(pl.current_period))
        ? node({
            id: "pl-current",
            kind: "account",
            label: "Current period",
            amount: toAmount(pl.current_period),
          })
        : null,
    ].filter((row): row is ReportNode => Boolean(row));
    plNodes.push(
      node({
        id: "pl-account",
        kind: "group",
        label: "Profit & Loss A/c",
        amount: plTotal,
        children,
      })
    );
  }

  const plSide = pl?.side === "assets" ? "assets" : "liabilities";
  const assets = balanceSection(
    "assets",
    "Assets",
    report.assets,
    plSide === "assets" ? plNodes : []
  );
  const liabilities = balanceSection(
    "liabilities",
    "Liabilities",
    report.liabilities,
    plSide === "liabilities" ? plNodes : []
  );
  const equity = balanceSection("equity", "Equity", report.equity);
  const assetTotal = toAmount(report.assets?.total);
  const liabilityTotal = toAmount(report.liabilities?.total);
  const equityTotal = toAmount(report.equity?.total);
  const financed = liabilityTotal + equityTotal;
  const balanced = Math.abs(assetTotal - financed) < 0.05;

  return {
    figures: [
      figure("assets", "Assets", formatInr(assetTotal)),
      figure("liabilities", "Liabilities", formatInr(liabilityTotal)),
      figure("equity", "Equity", formatInr(equityTotal)),
      figure(
        "status",
        "Equation",
        balanced ? "Balanced" : "Out of balance",
        balanced ? "success" : "danger"
      ),
    ],
    nodes: [assets, liabilities, equity].filter((section): section is ReportNode =>
      Boolean(section)
    ),
    notices: reportNotices(report),
    balanced,
  };
}

type AmountTotals = {
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
};

function emptyTotals(): AmountTotals {
  return {
    openingDebit: 0,
    openingCredit: 0,
    periodDebit: 0,
    periodCredit: 0,
    closingDebit: 0,
    closingCredit: 0,
  };
}

function addLine(totals: AmountTotals, line: TrialBalanceLine) {
  totals.openingDebit += toAmount(line.opening_debit);
  totals.openingCredit += toAmount(line.opening_credit);
  totals.periodDebit += toAmount(line.period_debit);
  totals.periodCredit += toAmount(line.period_credit);
  totals.closingDebit += toAmount(line.closing_debit);
  totals.closingCredit += toAmount(line.closing_credit);
}

function drcrNode(
  id: string,
  kind: ReportNode["kind"],
  label: string,
  totals: AmountTotals,
  children: ReportNode[] = [],
  withMovement = false
): ReportNode {
  return node({
    id,
    kind,
    label,
    mode: "drcr",
    debit: totals.closingDebit,
    credit: totals.closingCredit,
    openingDebit: withMovement ? totals.openingDebit : null,
    openingCredit: withMovement ? totals.openingCredit : null,
    periodDebit: withMovement ? totals.periodDebit : null,
    periodCredit: withMovement ? totals.periodCredit : null,
    children,
  });
}

function lineTotals(line: TrialBalanceLine): AmountTotals {
  const totals = emptyTotals();
  addLine(totals, line);
  return totals;
}

function natureKey(value?: string | null): string {
  const key = normalizeName(value);
  if (key.includes("asset")) {
    return "Assets";
  }
  if (key.includes("liabil")) {
    return "Liabilities";
  }
  if (key.includes("equity") || key.includes("capital")) {
    return "Equity";
  }
  if (key.includes("income")) {
    return "Income";
  }
  if (key.includes("expense")) {
    return "Expenses";
  }
  return "Other";
}

const NATURE_ORDER = ["Assets", "Liabilities", "Equity", "Income", "Expenses", "Other"];

function topGroupName(line: TrialBalanceLine): string {
  return line.top_group_name || line.primary_group_name || line.group_name || "Ungrouped";
}

export function buildTrialBalanceModel(report: TrialBalanceReport): FinancialReportModel {
  const lines = report.lines || [];
  const groups = new Map<string, TrialBalanceLine[]>();
  for (const line of lines) {
    const name = topGroupName(line);
    const current = groups.get(name) || [];
    current.push(line);
    groups.set(name, current);
  }

  const nodes = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, groupLines]) => {
      const totals = emptyTotals();
      const children = groupLines
        .slice()
        .sort((left, right) => (left.ledger_name || "").localeCompare(right.ledger_name || ""))
        .map((line, index) => {
          addLine(totals, line);
          return drcrNode(
            `tb:${name}:${line.ledger_id || index}`,
            "account",
            line.ledger_name || "Ledger",
            lineTotals(line),
            [],
            true
          );
        });
      return drcrNode(`tb-group:${name}`, "group", name, totals, children, true);
    });

  const totals = emptyTotals();
  if (report.totals) {
    totals.openingDebit = toAmount(report.totals.opening_debit);
    totals.openingCredit = toAmount(report.totals.opening_credit);
    totals.periodDebit = toAmount(report.totals.period_debit);
    totals.periodCredit = toAmount(report.totals.period_credit);
    totals.closingDebit = toAmount(report.totals.closing_debit);
    totals.closingCredit = toAmount(report.totals.closing_credit);
  } else {
    for (const line of lines) {
      addLine(totals, line);
    }
  }
  if (nodes.length) {
    nodes.push(drcrNode("tb-total", "total", "Total", totals, [], true));
  }
  const balanced = Math.abs(totals.closingDebit - totals.closingCredit) < 0.05;

  return {
    figures: [
      figure("debit", "Closing debit", formatInr(totals.closingDebit)),
      figure("credit", "Closing credit", formatInr(totals.closingCredit)),
      figure(
        "status",
        "Trial balance",
        balanced ? "Balanced" : "Out of balance",
        balanced ? "success" : "danger"
      ),
    ],
    nodes,
    notices: reportNotices(report),
    balanced,
  };
}

export function buildGroupSummaryModel(report: TrialBalanceReport): FinancialReportModel {
  const lines = report.lines || [];
  const byNature = new Map<string, TrialBalanceLine[]>();
  for (const line of lines) {
    const nature = natureKey(line.nature_of_group);
    const current = byNature.get(nature) || [];
    current.push(line);
    byNature.set(nature, current);
  }

  const grand = emptyTotals();
  let groupCount = 0;
  const nodes = NATURE_ORDER.filter((nature) => byNature.has(nature)).map((nature) => {
    const natureLines = byNature.get(nature) || [];
    const byTop = new Map<string, TrialBalanceLine[]>();
    for (const line of natureLines) {
      const name = topGroupName(line);
      const current = byTop.get(name) || [];
      current.push(line);
      byTop.set(name, current);
    }

    const groups = [...byTop.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, groupLines]) => {
        groupCount += 1;
        const bySub = new Map<string, TrialBalanceLine[]>();
        for (const line of groupLines) {
          const sub =
            line.sub_group_name && normalizeName(line.sub_group_name) !== normalizeName(name)
              ? line.sub_group_name
              : "";
          const current = bySub.get(sub) || [];
          current.push(line);
          bySub.set(sub, current);
        }

        const groupTotals = emptyTotals();
        const children: ReportNode[] = [];
        for (const [subName, subLines] of [...bySub.entries()].sort(([left], [right]) =>
          left.localeCompare(right)
        )) {
          const subTotals = emptyTotals();
          const accounts = subLines
            .slice()
            .sort((left, right) => (left.ledger_name || "").localeCompare(right.ledger_name || ""))
            .map((line, index) => {
              addLine(subTotals, line);
              addLine(groupTotals, line);
              addLine(grand, line);
              return drcrNode(
                `gs:${nature}:${name}:${subName}:${line.ledger_id || index}`,
                "account",
                line.ledger_name || "Ledger",
                lineTotals(line)
              );
            });
          if (!subName) {
            children.push(...accounts);
          } else {
            children.push(
              drcrNode(`gs:${nature}:${name}:${subName}`, "group", subName, subTotals, accounts)
            );
          }
        }
        return drcrNode(`gs:${nature}:${name}`, "group", name, groupTotals, children);
      });

    const natureTotals = emptyTotals();
    for (const line of natureLines) {
      addLine(natureTotals, line);
    }
    return drcrNode(`gs:${nature}`, "section", nature, natureTotals, groups);
  });

  return {
    figures: [
      figure("groups", "Groups", String(groupCount)),
      figure("debit", "Closing debit", formatInr(grand.closingDebit)),
      figure("credit", "Closing credit", formatInr(grand.closingCredit)),
    ],
    nodes,
    notices: reportNotices(report),
    balanced: null,
  };
}

export function filterReportNodes(nodes: ReportNode[], query: string): ReportNode[] {
  const text = query.trim().toLowerCase();
  if (!text) {
    return nodes;
  }

  const walk = (item: ReportNode): ReportNode | null => {
    const matches = item.label.toLowerCase().includes(text);
    if (matches && (item.kind === "section" || item.kind === "group")) {
      return item;
    }
    const children = item.children.map(walk).filter((child): child is ReportNode => Boolean(child));
    if (matches || children.length) {
      return { ...item, children: matches ? item.children : children };
    }
    return null;
  };

  return nodes.map(walk).filter((item): item is ReportNode => Boolean(item));
}

export function collectExpandableIds(nodes: ReportNode[]): string[] {
  const ids: string[] = [];
  const walk = (item: ReportNode) => {
    if (item.kind !== "section" && item.children.length) {
      ids.push(item.id);
    }
    item.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

function changeText(value: unknown): string {
  if (value == null || value === "") {
    return EMPTY;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function activityChangeRows(changes?: Record<string, unknown> | null): ActivityChangeRow[] {
  if (!changes) {
    return [];
  }
  return Object.entries(changes)
    .filter(([key]) => key !== "file_name")
    .map(([field, value]) => {
      if (value && typeof value === "object" && ("old" in value || "new" in value)) {
        const pair = value as { old?: unknown; new?: unknown };
        return {
          key: field,
          field: humanizeKey(field),
          from: changeText(pair.old),
          to: changeText(pair.new),
        };
      }
      return {
        key: field,
        field: humanizeKey(field),
        from: EMPTY,
        to: changeText(value),
      };
    });
}

const OPAQUE_REPR = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function activityObjectLabel(value?: string | null): string | null {
  const text = value?.trim();
  if (!text || OPAQUE_REPR.test(text)) {
    return null;
  }
  return text;
}

export function syncStatusTone(
  status?: string | null
): "success" | "processing" | "failed" | "queued" | "neutral" {
  const key = normalizeName(status);
  if (key === "success" || key.includes("complete")) {
    return "success";
  }
  if (key === "failed" || key === "error" || key.includes("fail")) {
    return "failed";
  }
  if (key === "pending" || key === "in_progress") {
    return "processing";
  }
  if (key === "retry" || key === "needs_review" || key === "skipped") {
    return "queued";
  }
  return "neutral";
}

export function activityActionTone(
  action?: string | null
): "success" | "processing" | "failed" | "queued" | "neutral" {
  const key = normalizeName(action);
  if (key.includes("fail") || key.includes("error") || key.includes("delete")) {
    return "failed";
  }
  if (key.includes("create") || key.includes("success") || key.includes("complete")) {
    return "success";
  }
  if (key.includes("update") || key.includes("login") || key.includes("post")) {
    return "processing";
  }
  return "neutral";
}
