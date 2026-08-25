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
  return item.vendor?.name || item.suggested_vendor?.name || "No vendor yet";
}

export function canActOnApproval(
  doc: FinancialDocumentDetail,
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  username?: string | null
): { canApprove: boolean; reason?: string } {
  if (role === "sales_manager") {
    return { canApprove: false, reason: "Forwarding for approval is available on the web app." };
  }
  if (!canApproveFinancialDocuments(config, role)) {
    return { canApprove: false };
  }
  if (doc.approval_status === "approved") {
    return { canApprove: false, reason: "This document is already approved." };
  }
  if (doc.gl_posting_status === "POSTED") {
    return { canApprove: false, reason: "Posted documents cannot be approved or rejected." };
  }
  if (isProcessingRow(doc)) {
    return { canApprove: false, reason: "Wait until processing finishes." };
  }
  const isOwnDoc = Boolean(username && doc.created_by && doc.created_by === username);
  if (isOwnDoc && !rbacAllows(config, role, "financial_document", "self_approve")) {
    return { canApprove: false, reason: "You cannot approve a document you uploaded." };
  }
  return { canApprove: true };
}
