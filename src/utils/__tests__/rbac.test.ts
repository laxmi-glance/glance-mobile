import type { RbacConfig } from "../../types/models";
import {
  canApproveFinancialDocuments,
  canUploadFinancialDocuments,
  canViewFinancialDocuments,
  rbacAllows,
} from "../rbac";

const config: RbacConfig = {
  version: 1,
  permissions: {
    accountant: {
      financial_document: ["view_all", "approve", "upload"],
    },
    standard_user: {
      financial_document: ["view_own", "upload", "self_approve"],
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

  test("allows a listed action and full access", () => {
    expect(rbacAllows(config, "accountant", "financial_document", "approve")).toBe(true);
    expect(
      rbacAllows(
        {
          version: 1,
          permissions: { owner: { financial_document: ["full_access"] } },
        },
        "owner",
        "financial_document",
        "approve"
      )
    ).toBe(true);
  });
});

describe("financial document capabilities", () => {
  test("view is allowed for own, team, or all", () => {
    expect(canViewFinancialDocuments(config, "accountant")).toBe(true);
    expect(canViewFinancialDocuments(config, "standard_user")).toBe(true);
    expect(canViewFinancialDocuments(config, "auditor")).toBe(false);
  });

  test("approve includes the self-approve action", () => {
    expect(canApproveFinancialDocuments(config, "accountant")).toBe(true);
    expect(canApproveFinancialDocuments(config, "standard_user")).toBe(true);
  });

  test("upload follows the upload action", () => {
    expect(canUploadFinancialDocuments(config, "accountant")).toBe(true);
    expect(canUploadFinancialDocuments(config, "auditor")).toBe(false);
  });
});
