import type { RbacConfig } from "../types/models";

function permissionList(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  module: string
): string[] | undefined {
  const permissions = config?.permissions;
  if (!permissions || !role || !module) {
    return undefined;
  }
  const direct = permissions[role]?.[module];
  if (Array.isArray(direct)) {
    return direct;
  }
  const wanted = role.toLowerCase();
  const key = Object.keys(permissions).find((name) => name.toLowerCase() === wanted);
  const list = key ? permissions[key]?.[module] : undefined;
  return Array.isArray(list) ? list : undefined;
}

/** UX check against the server matrix. `manage` and `admin` imply `view` on the same module. */
export function rbacAllows(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  module: string,
  action: string
): boolean {
  if (!config?.permissions || !role || !module || !action) {
    return false;
  }
  const list = permissionList(config, role, module);
  if (!list) {
    return false;
  }
  if (list.includes("full_access") || list.includes(action)) {
    return true;
  }
  if (action === "view" && (list.includes("manage") || list.includes("admin"))) {
    return true;
  }
  if (action === "profile_edit" && list.includes("update")) {
    return true;
  }
  return action === "export_financial" && list.includes("export");
}

export function rbacAllowsAny(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  module: string,
  actions: string[]
): boolean {
  return actions.some((action) => rbacAllows(config, role, module, action));
}

/**
 * Side-aware document visibility.
 * `view_all` sees both sides. A side flag limits visibility to that side.
 * Own or team visibility without a side flag sees both.
 */
export function canViewFinancialDocumentsOnSide(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  side: "ap" | "ar"
): boolean {
  if (rbacAllows(config, role, "financial_document", "view_all")) {
    return true;
  }
  const ownOrTeam =
    rbacAllows(config, role, "financial_document", "view_own") ||
    rbacAllows(config, role, "financial_document", "view_team");
  const ap = rbacAllows(config, role, "financial_document", "view_ap");
  const ar = rbacAllows(config, role, "financial_document", "view_ar");
  if (side === "ap") {
    return ap || (ownOrTeam && !ar);
  }
  return ar || (ownOrTeam && !ap);
}

export function canApproveFinancialDocuments(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return rbacAllowsAny(config, role, "financial_document", ["approve", "self_approve"]);
}

/** Upload API accepts a document upload grant or document-processor create/admin. */
export function canUploadFinancialDocuments(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return (
    rbacAllows(config, role, "financial_document", "upload") ||
    rbacAllows(config, role, "document_processor", "create") ||
    rbacAllows(config, role, "document_processor", "admin")
  );
}

export function canReadDocumentProcessor(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return rbacAllowsAny(config, role, "document_processor", [
    "view",
    "admin",
    "create",
    "view_own",
    "view_team",
  ]);
}

export function canWriteDocumentProcessor(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  return rbacAllowsAny(config, role, "document_processor", ["create", "admin"]);
}

/** Matches reports.user_can_access_consolidated_dashboard. */
export function canAccessConsolidatedDashboard(
  config: RbacConfig | null | undefined,
  role: string | null | undefined
): boolean {
  if (rbacAllows(config, role, "reports", "view")) {
    return true;
  }
  if (!rbacAllows(config, role, "product", "read")) {
    return false;
  }
  return rbacAllowsAny(config, role, "financial_document", ["view_own", "view_team", "view_all"]);
}

export function dashboardScopeAllows(
  config: RbacConfig | null | undefined,
  role: string | null | undefined,
  scopes: string[]
): boolean {
  return rbacAllowsAny(config, role, "dashboard", scopes);
}
