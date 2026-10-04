import { documentTypeLabel } from "../documentType";

describe("documentTypeLabel", () => {
  test("returns null for a blank type", () => {
    expect(documentTypeLabel(null)).toBeNull();
    expect(documentTypeLabel("  ")).toBeNull();
  });

  test("uses the short label for known types", () => {
    expect(documentTypeLabel("purchase_invoice")).toBe("Invoice");
    expect(documentTypeLabel("SALES_CREDIT_NOTE")).toBe("Credit Note");
    expect(documentTypeLabel("expenses_receipt")).toBe("Expense Receipt");
  });

  test("humanizes an unknown type", () => {
    expect(documentTypeLabel("goods_receipt")).toBe("Goods Receipt");
  });
});
