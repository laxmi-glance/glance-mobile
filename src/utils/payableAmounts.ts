import type { FinancialDocumentDetail, FinancialDocumentItem } from "../types/models";

export type PayableAmounts = {
  total: number | null;
  netPayable: number | null;
  tax: number | null;
  tds: number | null;
  lineTotal: number | null;
};

const GST_NATURES = new Set(["tax_gst"]);
const TDS_NATURES = new Set(["tax_tds", "tax_wht"]);
const NON_BASE_NATURES = new Set([
  "tax_gst",
  "tax_tds",
  "tax_tcs",
  "tax_wht",
  "tax_cess",
  "tax_other",
  "discount",
]);

export function parseAmount(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function natureOf(item: FinancialDocumentItem): string {
  return (item.transaction_nature || "").toLowerCase();
}

function sumAmounts(
  items: FinancialDocumentItem[],
  pick: (item: FinancialDocumentItem) => number | null
): number {
  return items.reduce((sum, item) => {
    const value = pick(item);
    return value == null ? sum : sum + value;
  }, 0);
}

function itemAmount(item: FinancialDocumentItem): number | null {
  return (
    parseAmount(item.line_total) ??
    parseAmount(item.base_amount) ??
    parseAmount(item.amount) ??
    parseAmount(item.total)
  );
}

function fromItems(items: FinancialDocumentItem[]): PayableAmounts | null {
  const realItems = items.filter((item) => Boolean(item.id) || itemAmount(item) != null);
  if (!realItems.length) {
    return null;
  }

  const baseItems = realItems.filter(
    (item) => !item.parent_line_id && !NON_BASE_NATURES.has(natureOf(item))
  );
  const gstItems = realItems.filter((item) => GST_NATURES.has(natureOf(item)));
  const tdsItems = realItems.filter((item) => TDS_NATURES.has(natureOf(item)));

  const lineTotal = sumAmounts(baseItems, itemAmount);
  const taxFromChildren = sumAmounts(
    gstItems,
    (item) => parseAmount(item.line_total) ?? parseAmount(item.gst_amount)
  );
  const taxFromParents = sumAmounts(baseItems, (item) => parseAmount(item.gst_amount));
  const tax = gstItems.length ? taxFromChildren : taxFromParents;
  const tds =
    sumAmounts(tdsItems, (item) => parseAmount(item.line_total) ?? parseAmount(item.tds_amount)) ||
    sumAmounts(baseItems, (item) => parseAmount(item.tds_amount));

  const total = lineTotal + tax;
  return {
    lineTotal,
    tax,
    tds,
    total,
    netPayable: total - tds,
  };
}

export function resolvePayableAmounts(doc: FinancialDocumentDetail): PayableAmounts {
  const fromApi: PayableAmounts = {
    total: parseAmount(doc.total) ?? parseAmount(doc.amount),
    netPayable: parseAmount(doc.net_payable),
    tax: parseAmount(doc.tax),
    tds: parseAmount(doc.tds),
    lineTotal: parseAmount(doc.line_total) ?? parseAmount(doc.sub_total),
  };

  if (
    fromApi.total != null ||
    fromApi.netPayable != null ||
    fromApi.tax != null ||
    fromApi.lineTotal != null
  ) {
    return {
      total:
        fromApi.total ??
        (fromApi.lineTotal != null ? fromApi.lineTotal + (fromApi.tax ?? 0) : fromApi.netPayable),
      netPayable: fromApi.netPayable ?? fromApi.total,
      tax: fromApi.tax,
      tds: fromApi.tds ?? 0,
      lineTotal: fromApi.lineTotal ?? fromApi.total,
    };
  }

  return (
    fromItems(doc.items || []) ?? {
      total: null,
      netPayable: null,
      tax: null,
      tds: null,
      lineTotal: null,
    }
  );
}
