import type { LedgerGroup } from "../types/accounting";
import type { StatusTone } from "./documentStatus";
import { formatInr, humanizeKey } from "./money";

const POSTING_LABELS: Record<string, string> = {
  POSTED: "Posted",
  PENDING: "Pending",
  VOIDED: "Voided",
};

export function postingStatusLabel(status?: string | null): string {
  const value = (status || "").trim();
  if (!value) {
    return "Draft";
  }
  return POSTING_LABELS[value.toUpperCase()] || humanizeKey(value.toLowerCase());
}

export function postingStatusTone(status?: string | null): StatusTone {
  switch ((status || "").trim().toUpperCase()) {
    case "POSTED":
      return "success";
    case "PENDING":
      return "processing";
    case "VOIDED":
      return "failed";
    default:
      return "neutral";
  }
}

export function ledgerGroupPath(group?: LedgerGroup | null): string {
  if (!group?.title) {
    return "Ungrouped";
  }
  const parent =
    group.parent_group_data?.title ||
    group.parent_group?.parent_group_data?.title ||
    group.parent_group?.title;
  if (parent && parent !== group.title) {
    return `${parent} / ${group.title}`;
  }
  return group.title;
}

export function ledgerNature(account: {
  nature_of_group?: string | null;
  ledger_group?: LedgerGroup | null;
}): string {
  return account.nature_of_group || account.ledger_group?.nature_of_group || "";
}

export function formatDrCr(value?: string | number | null): string {
  if (value == null || value === "") {
    return "—";
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return String(value);
  }
  if (amount === 0) {
    return formatInr(0);
  }
  return `${formatInr(Math.abs(amount))} ${amount > 0 ? "Dr" : "Cr"}`;
}

export function formatSideAmount(value?: string | number | null): string {
  if (value == null || value === "") {
    return "—";
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount === 0) {
    return "—";
  }
  return formatInr(amount);
}

export function previousIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function voucherLabel(entry: {
  voucher_number?: string | null;
  system_voucher_number?: string | null;
  voucher_type?: string | null;
}): string {
  const number = entry.voucher_number || entry.system_voucher_number;
  const type = entry.voucher_type || "Journal";
  return number ? `${type} ${number}` : type;
}
