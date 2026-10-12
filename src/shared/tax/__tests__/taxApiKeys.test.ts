import {
  readBillToTaxId,
  readIncomeTaxId,
  readIndirectTaxId,
  readInvoiceCurrencyAmount,
  readWithholdingSectionCode,
} from "../taxApiKeys";

describe("taxApiKeys", () => {
  it("reads neutral identity with legacy fallback", () => {
    expect(readIndirectTaxId({ indirect_tax_id: "A" })).toBe("A");
    expect(readIndirectTaxId({ indirect_tax_id: "", gstin: "B" })).toBe("B");
    expect(readIndirectTaxId({ gstin: "B" })).toBe("B");
    expect(readIncomeTaxId({ income_tax_id: "P" })).toBe("P");
    expect(readIncomeTaxId({ pan_number: "Q" })).toBe("Q");
  });

  it("reads bill-to and forex amounts with legacy fallback", () => {
    expect(readBillToTaxId({ bill_to_tax_id: "T1" })).toBe("T1");
    expect(readBillToTaxId({ bill_to_gstin: "T2" })).toBe("T2");
    expect(readInvoiceCurrencyAmount({ invoice_currency_amount: 12 })).toBe(12);
    expect(readInvoiceCurrencyAmount({ base_currency_amount: 9 })).toBe(9);
    expect(readInvoiceCurrencyAmount({})).toBeNull();
  });

  it("reads withholding section code with legacy fallback", () => {
    expect(readWithholdingSectionCode({ code: "194C" })).toBe("194C");
    expect(readWithholdingSectionCode({ section_id: "194J" })).toBe("194J");
  });
});
