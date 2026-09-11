import { humanizeKey } from "./money";

const SHORT_LABELS: Record<string, string> = {
  purchase_invoice: "Invoice",
  sales_invoice: "Invoice",
  invoice: "Invoice",
  purchase_credit_note: "Credit Note",
  sales_credit_note: "Credit Note",
  credit_note: "Credit Note",
  purchase_debit_note: "Debit Note",
  sales_debit_note: "Debit Note",
  debit_note: "Debit Note",
  expenses_receipt: "Expense Receipt",
  expense_receipt: "Expense Receipt",
  others: "Other",
};

export function documentTypeLabel(value?: string | null): string | null {
  const key = value?.trim().toLowerCase();
  if (!key) {
    return null;
  }
  return SHORT_LABELS[key] ?? humanizeKey(key);
}
