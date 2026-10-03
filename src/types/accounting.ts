export type LedgerGroup = {
  id: string;
  title: string;
  is_primary?: boolean;
  description?: string | null;
  nature_of_group?: string | null;
  source_system?: string | null;
  parent_group_data?: {
    id?: string;
    title?: string;
    nature_of_group?: string | null;
  } | null;
  parent_group?: {
    id?: string;
    title?: string;
    nature_of_group?: string | null;
    parent_group_data?: { title?: string } | null;
  } | null;
};

export type LedgerAccount = {
  id: string;
  title: string;
  description?: string | null;
  statutory_code?: string | null;
  tax_rate?: string | number | null;
  inventory_item?: boolean | null;
  nature_of_group?: string | null;
  source_system?: string | null;
  gst_type?: string | null;
  ledger_group?: LedgerGroup | null;
  tds_ledger_detail?: {
    section_id?: string | null;
    section_name?: string | null;
    payable_ledger_name?: string | null;
  } | null;
};

export type JournalEntryListItem = {
  id: string;
  date?: string | null;
  voucher_type?: string | null;
  source_voucher_type?: string | null;
  voucher_number?: string | null;
  system_voucher_number?: string | null;
  narration?: string | null;
  post_status?: string | null;
  total_debit?: string | number | null;
  total_credit?: string | number | null;
  ledger_name?: string | null;
  lines_count?: number;
  is_balanced?: boolean;
};

export type JournalLineDetail = {
  id: string;
  debit_amount?: string | number | null;
  credit_amount?: string | number | null;
  line_narration?: string | null;
  position?: number | null;
  account?: {
    id?: string;
    title?: string | null;
    statutory_code?: string | null;
  } | null;
};

export type JournalEntryDetail = JournalEntryListItem & {
  reference_number?: string | null;
  invoice_currency?: string | null;
  lines?: JournalLineDetail[];
};

export type LedgerTransaction = {
  id: string;
  debit_amount?: string | number | null;
  credit_amount?: string | number | null;
  particulars?: string | null;
  line_narration?: string | null;
  running_balance?: string | number | null;
  journal_entry?: {
    id: string;
    date?: string | null;
    voucher_number?: string | null;
    voucher_type?: string | null;
    narration?: string | null;
    post_status?: string | null;
  } | null;
};

export type AccountBalance = {
  debit?: number;
  credit?: number;
  balance?: number;
  source?: string;
};
