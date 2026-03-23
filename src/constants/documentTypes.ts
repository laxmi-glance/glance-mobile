/** Values must match `core.enums.DocumentType` on the backend. */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'purchase_invoice', label: 'Purchase invoice' },
  { value: 'purchase_credit_note', label: 'Purchase credit note' },
  { value: 'purchase_debit_note', label: 'Purchase debit note' },
  { value: 'expenses_receipt', label: 'Expense receipt' },
  { value: 'sales_invoice', label: 'Sales invoice' },
  { value: 'sales_credit_note', label: 'Sales credit note' },
  { value: 'sales_debit_note', label: 'Sales debit note' },
  { value: 'others', label: 'Other' },
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPE_OPTIONS)[number]['value'];

export function labelForDocumentType(value: string): string {
  const row = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value);
  return row?.label ?? value;
}
