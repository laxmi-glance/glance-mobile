import { formatInr } from "../money";
import { buildReportPresets } from "../reportPeriod";
import {
  activityChangeRows,
  activityObjectLabel,
  buildBalanceSheetModel,
  buildGroupSummaryModel,
  buildProfitAndLossModel,
  buildTrialBalanceModel,
  filterReportNodes,
  formatDrCr,
  formatSignedAmount,
} from "../reportLayout";
import type { ProfitAndLossReport, TrialBalanceReport } from "../../types/reports";

const profitAndLoss: ProfitAndLossReport = {
  income: {
    operating_income: {
      groups: [
        {
          group_name: "Sales Accounts",
          items: [
            {
              account_id: "sales-1",
              account_name: "Local Sales",
              line_total: 1000,
              primary_group_name: "Sales Accounts",
              group_name: "Sales Accounts",
            },
          ],
        },
      ],
      total: 1000,
    },
    other_income: {
      groups: [
        {
          group_name: "Indirect Incomes",
          items: [
            {
              account_id: "other-1",
              account_name: "Interest",
              line_total: 50,
              primary_group_name: "Indirect Incomes",
            },
          ],
        },
      ],
      total: 50,
    },
    total: 1050,
  },
  expenses: {
    cost_of_goods_sold: {
      groups: [
        {
          group_name: "Purchase Accounts",
          items: [
            {
              account_id: "buy-1",
              account_name: "Purchases",
              line_total: 400,
              primary_group_name: "Purchase Accounts",
            },
          ],
        },
      ],
      total: 400,
    },
    operating_expenses: {
      groups: [
        {
          group_name: "Indirect Expenses",
          items: [
            {
              account_id: "rent-1",
              account_name: "Rent",
              line_total: 100,
              primary_group_name: "Indirect Expenses",
            },
          ],
        },
      ],
      total: 100,
    },
    other_expenses: { groups: [], total: 0 },
    total: 500,
  },
  net_profit: 550,
  opening_balance_health: { healthy: false, message: "Opening balance voucher is missing." },
};

describe("report amounts", () => {
  test("formats debit and credit sides", () => {
    expect(formatDrCr(10, 0)).toBe(`${formatInr(10)} Dr`);
    expect(formatDrCr(0, 25)).toBe(`${formatInr(25)} Cr`);
    expect(formatDrCr(10, 4)).toBe(`${formatInr(10)} Dr · ${formatInr(4)} Cr`);
    expect(formatDrCr(0, 0)).toBe("—");
  });

  test("prefixes a minus on negative signed amounts", () => {
    expect(formatSignedAmount(-10)).toBe(`-${formatInr(10)}`);
    expect(formatSignedAmount(null)).toBe("—");
  });
});

describe("buildReportPresets", () => {
  const onDate = new Date(2026, 9, 3);
  const fiscalYear = {
    name: "FY 2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
  };

  test("matches the web range presets for a Saturday in October", () => {
    const presets = buildReportPresets("range", onDate, fiscalYear);
    const byId = Object.fromEntries(presets.map((preset) => [preset.id, preset]));

    expect(byId["current-fy"]).toMatchObject({
      label: "Current Fiscal Year",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    });
    expect(byId["fy-to-date"]).toMatchObject({
      label: "Financial Year To Date",
      startDate: "2026-04-01",
      endDate: "2026-10-03",
    });
    expect(byId["previous-fy"]).toMatchObject({
      startDate: "2025-04-01",
      endDate: "2026-03-31",
    });
    expect(byId.today).toMatchObject({ startDate: "2026-10-03", endDate: "2026-10-03" });
    expect(byId["this-week"]).toMatchObject({ startDate: "2026-09-27", endDate: "2026-10-03" });
    expect(byId["this-month"]).toMatchObject({ startDate: "2026-10-01", endDate: "2026-10-31" });
    expect(byId["this-quarter"]).toMatchObject({ startDate: "2026-10-01", endDate: "2026-12-31" });
    expect(byId.yesterday).toMatchObject({ startDate: "2026-10-02", endDate: "2026-10-02" });
    expect(byId["previous-week"]).toMatchObject({ startDate: "2026-09-20", endDate: "2026-09-26" });
    expect(byId["previous-month"]).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(byId["previous-quarter"]).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-09-30",
    });
  });

  test("uses the April financial year when no fiscal year is active", () => {
    const presets = buildReportPresets("range", new Date(2026, 1, 10), null);
    expect(presets.find((preset) => preset.id === "current-fy")).toMatchObject({
      startDate: "2025-04-01",
      endDate: "2026-03-31",
    });
  });

  test("uses the web as-of presets for a single date", () => {
    const presets = buildReportPresets("date", onDate, fiscalYear);
    const byId = Object.fromEntries(presets.map((preset) => [preset.id, preset]));

    expect(byId["current-fy"]).toMatchObject({ endDate: "2027-03-31" });
    expect(byId["this-month"].endDate).toBe("2026-10-31");
    expect(byId["this-year"].endDate).toBe("2026-12-31");
    expect(byId["previous-year"].endDate).toBe("2025-12-31");
    expect(byId["previous-fy"].label).toBe("Previous Fiscal Year");
  });
});

describe("buildProfitAndLossModel", () => {
  test("splits trading and income-statement groups and keeps the net result", () => {
    const model = buildProfitAndLossModel(profitAndLoss);
    const trading = model.nodes.find((item) => item.id === "trading");
    const statement = model.nodes.find((item) => item.id === "statement");

    expect(trading?.children.map((item) => item.label)).toEqual([
      "Purchase Accounts",
      "Sales Accounts",
      "Gross Profit",
    ]);
    expect(
      trading?.children.find((item) => item.label === "Sales Accounts")?.children[0].label
    ).toBe("Local Sales");
    expect(statement?.children.map((item) => item.label)).toEqual([
      "Indirect Expenses",
      "Indirect Incomes",
      "Nett Profit",
    ]);
    expect(model.figures.find((item) => item.id === "net")?.value).toBe(formatInr(550));
    expect(model.notices).toEqual(["Opening balance voucher is missing."]);
  });
});

describe("buildBalanceSheetModel", () => {
  test("places profit and loss on the reported side and checks the equation", () => {
    const model = buildBalanceSheetModel({
      assets: {
        groups: [
          {
            group_name: "Current Assets",
            subtotal: 800,
            items: [{ account_id: "bank", account_name: "Bank", line_total: 800 }],
          },
        ],
        total: 800,
      },
      liabilities: {
        groups: [
          {
            group_name: "Current Liabilities",
            subtotal: 300,
            items: [{ account_id: "creditors", account_name: "Creditors", line_total: 300 }],
          },
        ],
        total: 500,
      },
      equity: {
        groups: [
          {
            group_name: "Capital Account",
            subtotal: 300,
            items: [{ account_id: "capital", account_name: "Capital", line_total: 300 }],
          },
        ],
        total: 300,
      },
      profit_and_loss: {
        side: "liabilities",
        opening_balance: 100,
        current_period: 100,
        total: 200,
      },
    });

    const liabilities = model.nodes.find((item) => item.id === "liabilities");
    expect(liabilities?.children.map((item) => item.label)).toEqual([
      "Current Liabilities",
      "Profit & Loss A/c",
      "Total liabilities",
    ]);
    expect(model.balanced).toBe(true);
    expect(model.figures.find((item) => item.id === "status")?.value).toBe("Balanced");
  });

  test("explains an empty workspace", () => {
    expect(buildBalanceSheetModel({ no_data: true }).notices[0]).toMatch(/journal entries/i);
  });
});

describe("trial balance and group summary", () => {
  const report: TrialBalanceReport = {
    lines: [
      {
        ledger_id: "cash",
        ledger_name: "Cash",
        top_group_name: "Current Assets",
        sub_group_name: "Cash-in-Hand",
        nature_of_group: "Assets",
        closing_debit: 40,
        closing_credit: 0,
      },
      {
        ledger_id: "bank",
        ledger_name: "Bank",
        top_group_name: "Current Assets",
        sub_group_name: "Bank Accounts",
        nature_of_group: "Assets",
        closing_debit: 60,
        closing_credit: 0,
        opening_debit: 20,
        period_debit: 40,
      },
      {
        ledger_id: "capital",
        ledger_name: "Capital",
        top_group_name: "Capital Account",
        nature_of_group: "Equity",
        closing_debit: 0,
        closing_credit: 100,
      },
    ],
    totals: {
      closing_debit: 100,
      closing_credit: 100,
    },
  };

  test("groups trial balance ledgers and marks a balanced total", () => {
    const model = buildTrialBalanceModel(report);
    const assets = model.nodes.find((item) => item.label === "Current Assets");
    expect(assets?.children.map((item) => item.label)).toEqual(["Bank", "Cash"]);
    expect(assets?.debit).toBe(100);
    expect(model.nodes.at(-1)?.label).toBe("Total");
    expect(model.balanced).toBe(true);
  });

  test("nests group summary by nature and subgroup", () => {
    const model = buildGroupSummaryModel(report);
    const assets = model.nodes.find((item) => item.label === "Assets");
    const current = assets?.children.find((item) => item.label === "Current Assets");
    expect(current?.children.map((item) => item.label)).toEqual(["Bank Accounts", "Cash-in-Hand"]);
    expect(model.figures.find((item) => item.id === "groups")?.value).toBe("2");
  });
});

describe("filterReportNodes", () => {
  test("keeps the parent group when a ledger matches", () => {
    const model = buildProfitAndLossModel(profitAndLoss);
    const filtered = filterReportNodes(model.nodes, "rent");
    expect(filtered.map((item) => item.label)).toEqual(["Income statement"]);
    expect(filtered[0].children.map((item) => item.label)).toEqual(["Indirect Expenses"]);
    expect(filtered[0].children[0].children.map((item) => item.label)).toEqual(["Rent"]);
  });
});

describe("activity helpers", () => {
  test("turns change objects into old and new values", () => {
    expect(
      activityChangeRows({
        file_name: "skip.pdf",
        status: { old: "draft", new: "posted" },
        note: "hello",
      })
    ).toEqual([
      { key: "status", field: "Status", from: "draft", to: "posted" },
      { key: "note", field: "Note", from: "—", to: "hello" },
    ]);
  });

  test("hides id-style object labels", () => {
    expect(activityObjectLabel("Invoice 12")).toBe("Invoice 12");
    expect(activityObjectLabel("123e4567-e89b-12d3-a456-426614174000")).toBeNull();
  });
});
