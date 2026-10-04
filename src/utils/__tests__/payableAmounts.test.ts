import type { FinancialDocumentDetail } from "../../types/models";
import { parseAmount, resolvePayableAmounts } from "../payableAmounts";

function doc(overrides: Partial<FinancialDocumentDetail> = {}): FinancialDocumentDetail {
  return {
    id: "doc-1",
    created_on: "2026-04-03T00:00:00Z",
    ...overrides,
  };
}

describe("parseAmount", () => {
  test("parses numbers and grouped strings", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("1,234.50")).toBe(1234.5);
    expect(parseAmount(10)).toBe(10);
    expect(parseAmount("nope")).toBeNull();
    expect(parseAmount(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("resolvePayableAmounts", () => {
  test("uses header amounts when the API already computed them", () => {
    expect(
      resolvePayableAmounts(
        doc({
          line_total: "1000",
          tax: "180",
          tds: "100",
          total: "1180",
          net_payable: "1080",
        })
      )
    ).toEqual({
      lineTotal: 1000,
      tax: 180,
      tds: 100,
      total: 1180,
      netPayable: 1080,
    });
  });

  test("derives tax and TDS from line items when headers are empty", () => {
    expect(
      resolvePayableAmounts(
        doc({
          items: [
            { id: "line-1", line_total: "1000" },
            {
              id: "gst-1",
              transaction_nature: "tax_gst",
              line_total: "180",
              parent_line_id: "line-1",
            },
            { id: "tds-1", transaction_nature: "tax_tds", line_total: "50" },
          ],
        })
      )
    ).toEqual({
      lineTotal: 1000,
      tax: 180,
      tds: 50,
      total: 1180,
      netPayable: 1130,
    });
  });

  test("returns empty amounts when there is nothing to total", () => {
    expect(resolvePayableAmounts(doc())).toEqual({
      total: null,
      netPayable: null,
      tax: null,
      tds: null,
      lineTotal: null,
    });
  });
});
