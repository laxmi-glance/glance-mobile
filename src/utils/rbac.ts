import type { RbacConfig } from "../types/models";

export function rbacAllows(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  module: string,
  action: string
): boolean {
  if (!config?.permissions || !role || !module || !action) {
    return false;
  }
  const list = config.permissions[role]?.[module];
  if (!Array.isArray(list)) {
    return false;
  }
  return list.includes("full_access") || list.includes(action);
}

export function canViewFinancialDocuments(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return (
    rbacAllows(config, role, "financial_document", "view_own") ||
    rbacAllows(config, role, "financial_document", "view_team") ||
    rbacAllows(config, role, "financial_document", "view_all")
  );
}

export function canApproveFinancialDocuments(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return (
    rbacAllows(config, role, "financial_document", "approve") ||
    rbacAllows(config, role, "financial_document", "self_approve")
  );
}

export function canUploadFinancialDocuments(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return rbacAllows(config, role, "financial_document", "upload");
}
