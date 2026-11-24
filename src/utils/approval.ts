import type {
  ApprovalStatus,
  ApprovalTrail,
  ApprovalTrailRun,
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
  if (!isOwnDoc && !rbacAllows(config, role, "financial_document", "approve")) {
    return denied();
  }
  if (doc.approval_status === "approved") {
    return { canApprove: false, canReject: true };
  }
  if (doc.approval_status === "rejected") {
    return { canApprove: true, canReject: false };
  }
  return { canApprove: true, canReject: true };
}

/**
 * Narrow or widen the role-based gate with what the server says about this document.
 *
 * While a document is pending, the server knows whose turn it is: an assigned approver, the
 * approvers of the current policy step, or an owner or admin overriding. Decided documents keep
 * the role-based gate (reversing a decision is not a step).
 */
export function applyApprovalTrail(
  gate: ApprovalActionGate,
  doc: FinancialDocumentDetail,
  trail: ApprovalTrail | null | undefined
): ApprovalActionGate {
  if (!trail || doc.approval_status !== "pending" || doc.gl_posting_status === "POSTED") {
    return gate;
  }
  if (trail.can_decide) {
    return { canApprove: true, canReject: true };
  }
  const names = (trail.waiting_for || []).map((person) => person?.name).filter(Boolean);
  return denied(
    names.length
      ? `Waiting for ${names.join(", ")}.`
      : gate.reason || "This document is not waiting for your decision."
  );
}

/** One line for the current state of an approval, or null when there is nothing to add. */
export function approvalProgressLine(trail: ApprovalTrail | null | undefined): string | null {
  if (!trail) {
    return null;
  }
  const names = (trail.waiting_for || []).map((person) => person?.name).filter(Boolean);
  if (!names.length) {
    return null;
  }
  const step = trail.current_step;
  const who =
    names.length > 1
      ? `${step?.mode === "any" ? "any one of" : "all of"} ${names.join(", ")}`
      : names[0];
  return step
    ? `Step ${step.sequence} of ${step.total_steps}: waiting for ${who}`
    : `Waiting for ${who}`;
}

/** One row per step of the latest approval run: who decided, or who the step is waiting for. */
export function approvalStepRows(
  trail: ApprovalTrail | null | undefined
): { label: string; value: string }[] {
  const run = currentApprovalRun(trail);
  if (!run) {
    return [];
  }
  return run.steps.map((step) => {
    const namesWith = (status: string) =>
      step.assignments
        .filter((assignment) => assignment.status === status)
        .map((assignment) => assignment.approver?.name)
        .filter(Boolean)
        .join(", ");
    let value: string;
    switch (step.status) {
      case "approved":
        value = `Approved by ${namesWith("approved") || "—"}`;
        break;
      case "rejected":
        value = `Rejected by ${namesWith("rejected") || "—"}`;
        break;
      case "pending": {
        const done = namesWith("approved");
        const waiting = `Waiting for ${namesWith("pending") || "—"}`;
        value = done ? `${waiting} (approved by ${done})` : waiting;
        break;
      }
      case "cancelled":
        value = "Cancelled";
        break;
      default:
        value = "Not started";
    }
    return {
      label: step.name ? `Step ${step.sequence}: ${step.name}` : `Step ${step.sequence}`,
      value,
    };
  });
}

/**
 * The run that explains the document's present approval status: the one in progress, or the
 * latest finished one if it produced that status. A cancelled run, or an approved run on a
 * document that was rejected afterwards, no longer describes the document and is left out.
 */
export function currentApprovalRun(
  trail: ApprovalTrail | null | undefined
): ApprovalTrailRun | null {
  const run = trail?.runs?.[0];
  if (!trail || !run) {
    return null;
  }
  if (run.status === "in_progress") {
    return run;
  }
  if (run.status === "approved" || run.status === "rejected") {
    return run.status === trail.approval_status ? run : null;
  }
  return null;
}
