import type { RbacConfig } from "../../types/models";
import {
  canAccessConsolidatedDashboard,
  canApproveFinancialDocuments,
  canReadDocumentProcessor,
  canUploadFinancialDocuments,
  canViewFinancialDocumentsOnSide,
  canWriteDocumentProcessor,
  dashboardScopeAllows,
  rbacAllows,
} from "../rbac";

const config: RbacConfig = {
  version: 3,
  permissions: {
    Accountant: {
      financial_document: ["view_all", "approve", "upload", "self_approve"],
      reports: ["export"],
      company: ["update"],
      fiscal_year: ["manage"],
      product: ["read"],
    },
    standard_user: {
      financial_document: ["create_ap", "approve", "view_ap", "view_own", "view_team"],
      document_processor: ["create", "view_own", "view_team"],
      product: ["read"],
      dashboard: ["view_purchase"],
    },
    sales_manager: {
      financial_document: ["approve", "view_ap", "view_ar", "view_own", "view_team"],
      document_processor: ["create", "view_own", "view_team"],
      dashboard: ["view_sales"],
    },
    mis_reporter: {
      financial_document: ["approve", "view_ap", "view_own", "view_team"],
      document_processor: ["create", "view_own", "view_team"],
      reports: ["view", "export_financial"],
      dashboard: ["view_financial", "view_purchase"],
    },
    auditor: {
      financial_document: ["view_all"],
      document_processor: ["view"],
      reports: ["view"],
      dashboard: ["view_financial"],
    },
    expense_manager: {
      fiscal_year: ["view"],
    },
    owner: {
      document_processor: ["admin"],
      dashboard: ["view_full"],
      financial_document: ["full_access"],
    },
  },
};

describe("rbacAllows", () => {
  test("denies missing config, role, module, or action", () => {
    expect(rbacAllows(null, "accountant", "financial_document", "view_all")).toBe(false);
    expect(rbacAllows(config, null, "financial_document", "view_all")).toBe(false);
    expect(rbacAllows(config, "accountant", "", "view_all")).toBe(false);
    expect(rbacAllows(config, "missing", "financial_document", "view_all")).toBe(false);
  });

  test("matches role names without case and applies implied grants", () => {
    expect(rbacAllows(config, "accountant", "financial_document", "approve")).toBe(true);
    expect(rbacAllows(config, "accountant", "fiscal_year", "view")).toBe(true);
    expect(rbacAllows(config, "accountant", "company", "profile_edit")).toBe(true);
    expect(rbacAllows(config, "accountant", "reports", "export_financial")).toBe(true);
    expect(rbacAllows(config, "owner", "financial_document", "delete")).toBe(true);
    expect(rbacAllows(config, "owner", "document_processor", "view")).toBe(true);
  });
});

describe("financial document visibility", () => {
  test("limits purchase roles to AP and sales roles to both sides they hold", () => {
    expect(canViewFinancialDocumentsOnSide(config, "standard_user", "ap")).toBe(true);
    expect(canViewFinancialDocumentsOnSide(config, "standard_user", "ar")).toBe(false);
    expect(canViewFinancialDocumentsOnSide(config, "mis_reporter", "ar")).toBe(false);
    expect(canViewFinancialDocumentsOnSide(config, "sales_manager", "ap")).toBe(true);
    expect(canViewFinancialDocumentsOnSide(config, "sales_manager", "ar")).toBe(true);
    expect(canViewFinancialDocumentsOnSide(config, "auditor", "ap")).toBe(true);
    expect(canViewFinancialDocumentsOnSide(config, "auditor", "ar")).toBe(true);
  });

  test("own or team visibility without a side flag sees both sides", () => {
    const ownOnly: RbacConfig = {
      version: 3,
      permissions: { clerk: { financial_document: ["view_own"] } },
    };
    expect(canViewFinancialDocumentsOnSide(ownOnly, "clerk", "ap")).toBe(true);
    expect(canViewFinancialDocumentsOnSide(ownOnly, "clerk", "ar")).toBe(true);
  });
});

describe("upload, approval, and document processing", () => {
  test("upload follows upload, create, or admin", () => {
    expect(canUploadFinancialDocuments(config, "accountant")).toBe(true);
    expect(canUploadFinancialDocuments(config, "standard_user")).toBe(true);
    expect(canUploadFinancialDocuments(config, "sales_manager")).toBe(true);
    expect(canUploadFinancialDocuments(config, "owner")).toBe(true);
    expect(canUploadFinancialDocuments(config, "auditor")).toBe(false);
    expect(canUploadFinancialDocuments(config, "expense_manager")).toBe(false);
  });

  test("approve includes approve or self-approve", () => {
    expect(canApproveFinancialDocuments(config, "accountant")).toBe(true);
    expect(canApproveFinancialDocuments(config, "standard_user")).toBe(true);
    expect(canApproveFinancialDocuments(config, "auditor")).toBe(false);
  });

  test("queue read and retry follow document processor actions", () => {
    expect(canReadDocumentProcessor(config, "auditor")).toBe(true);
    expect(canReadDocumentProcessor(config, "standard_user")).toBe(true);
    expect(canReadDocumentProcessor(config, "expense_manager")).toBe(false);
    expect(canWriteDocumentProcessor(config, "standard_user")).toBe(true);
    expect(canWriteDocumentProcessor(config, "owner")).toBe(true);
    expect(canWriteDocumentProcessor(config, "auditor")).toBe(false);
  });
});

describe("dashboard scopes", () => {
  test("consolidated home requires reports or a scoped document reader", () => {
    expect(canAccessConsolidatedDashboard(config, "auditor")).toBe(true);
    expect(canAccessConsolidatedDashboard(config, "standard_user")).toBe(true);
    expect(canAccessConsolidatedDashboard(config, "expense_manager")).toBe(false);
  });

  test("widget scopes match the server dashboard map", () => {
    expect(
      dashboardScopeAllows(config, "standard_user", ["view_full", "view_purchase", "view_sales"])
    ).toBe(true);
    expect(dashboardScopeAllows(config, "standard_user", ["view_full", "view_sales"])).toBe(false);
    expect(dashboardScopeAllows(config, "sales_manager", ["view_full", "view_financial"])).toBe(
      false
    );
    expect(dashboardScopeAllows(config, "mis_reporter", ["view_full", "view_financial"])).toBe(
      true
    );
  });
});
