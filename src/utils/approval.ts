import type {
  ApprovalStatus,
  FinancialDocumentDetail,
  FinancialDocumentListItem,
  RbacConfig,
} from "../types/models";
import type { StatusTone } from "./documentStatus";
import { rbacAllows, canApproveFinancialDocuments } from "./rbac";

export function isProcessingRow(item: FinancialDocumentListItem): boolean {
  return Boolean(item.status) && item.approval_status == null && item.total == null;
}

export function approvalLabel(status?: ApprovalStatus | null): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      return "Pending";
    default:
      return "—";
  }
}

export function approvalTone(status?: ApprovalStatus | null): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "failed";
    case "pending":
      return "queued";
    default:
      return "neutral";
  }
}

function postingStatus(item: FinancialDocumentListItem): string {
  return String(item.gl_posting_status || "").toUpperCase();
}

export function documentLifecycleLabel(item: FinancialDocumentListItem): string {
  if (isProcessingRow(item)) {
    return item.status || "Processing";
  }
  const posting = postingStatus(item);
  if (posting === "POSTED") {
    return "Posted";
  }
  if (posting === "VOIDED") {
    return "Voided";
  }
  return approvalLabel(item.approval_status);
}

export function documentLifecycleTone(item: FinancialDocumentListItem): StatusTone {
  if (isProcessingRow(item)) {
    return "processing";
  }
  const posting = postingStatus(item);
  if (posting === "POSTED") {
    return "success";
  }
  if (posting === "VOIDED") {
    return "failed";
  }
  return approvalTone(item.approval_status);
}

export function uploaderName(item: FinancialDocumentListItem): string | null {
  const name = (item.created_by || item.created_by_username || "").trim();
  return name || null;
}

export function displayName(
  user?: { first_name?: string; last_name?: string; username?: string } | null
): string {
  if (!user) {
    return "—";
  }
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.username || "—";
}

export function vendorName(item: FinancialDocumentListItem): string {
  return item.party?.name || item.suggested_party?.name || "No vendor yet";
}

export type ApprovalActionGate = {
  canApprove: boolean;
  canReject: boolean;
  reason?: string;
};

function denied(reason?: string): ApprovalActionGate {
  return { canApprove: false, canReject: false, reason };
}

export function canActOnApproval(
  doc: FinancialDocumentDetail,
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  username?: string | null
): ApprovalActionGate {
  if (role === "sales_manager") {
    return denied("Forwarding for approval is available on the web app.");
  }
  if (!canApproveFinancialDocuments(config, role)) {
    return denied();
  }
  if (doc.gl_posting_status === "POSTED") {
    return denied("Posted documents cannot be approved or rejected.");
  }
  if (isProcessingRow(doc)) {
    return denied("Wait until processing finishes.");
  }
  const isOwnDoc = Boolean(username && doc.created_by && doc.created_by === username);
  if (isOwnDoc && !rbacAllows(config, role, "financial_document", "self_approve")) {
    return denied("You cannot approve a document you uploaded.");
  }
  if (doc.approval_status === "approved") {
    return { canApprove: false, canReject: true };
  }
  if (doc.approval_status === "rejected") {
    return { canApprove: true, canReject: false };
  }
  return { canApprove: true, canReject: true };
}
