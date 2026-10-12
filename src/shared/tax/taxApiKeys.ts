/** Neutral tax API keys (F12); read helpers accept legacy fallbacks from the expand phase. */

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

export function readIndirectTaxId(rowIn: object | null | undefined): string {
  const row = rowIn as Record<string, unknown> | null | undefined;
  if (!row) return "";
  return firstNonEmptyString(row.indirect_tax_id, row.gstin_number, row.gstin, row.vendor_gstin);
}

export function readIncomeTaxId(rowIn: object | null | undefined): string {
  const row = rowIn as Record<string, unknown> | null | undefined;
  if (!row) return "";
  return firstNonEmptyString(row.income_tax_id, row.pan_number);
}

export function readBillToTaxId(docIn: object | null | undefined): string {
  const doc = docIn as Record<string, unknown> | null | undefined;
  if (!doc) return "";
  return firstNonEmptyString(doc.bill_to_tax_id, doc.bill_to_gstin);
}

export function readInvoiceCurrencyAmount(
  itemIn: object | null | undefined
): string | number | null {
  const item = itemIn as Record<string, unknown> | null | undefined;
  if (!item) return null;
  const neutral = item.invoice_currency_amount;
  if (neutral != null && neutral !== "") return neutral as string | number;
  const legacy = item.base_currency_amount;
  if (legacy != null && legacy !== "") return legacy as string | number;
  return null;
}

export function readWithholdingSectionCode(sectionIn: object | null | undefined): string {
  const section = sectionIn as Record<string, unknown> | null | undefined;
  if (!section) return "";
  return firstNonEmptyString(section.code, section.section_id);
}
