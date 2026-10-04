import type {
  FinancialDocumentDetail,
  FinancialDocumentListItem,
  RbacConfig,
} from "../../types/models";
import {
  approvalLabel,
  canActOnApproval,
  displayName,
  documentLifecycleLabel,
  isProcessingRow,
  uploaderName,
  vendorName,
} from "../approval";

const config: RbacConfig = {
  version: 1,
  permissions: {
    accountant: {
      financial_document: ["approve", "view_all"],
    },
    standard_user: {
      financial_document: ["self_approve", "view_own"],
    },
  },
};

function listItem(overrides: Partial<FinancialDocumentListItem> = {}): FinancialDocumentListItem {
  return {
    id: "doc-1",
    created_on: "2026-04-03T00:00:00Z",
    ...overrides,
  };
}

function detail(overrides: Partial<FinancialDocumentDetail> = {}): FinancialDocumentDetail {
  return listItem(overrides);
}

describe("approval labels", () => {
  test("maps known statuses and an empty status", () => {
    expect(approvalLabel("approved")).toBe("Approved");
    expect(approvalLabel("rejected")).toBe("Rejected");
    expect(approvalLabel("pending")).toBe("Pending");
    expect(approvalLabel(null)).toBe("—");
  });
});

describe("document lifecycle", () => {
  test("treats an unapproved processing row as still processing", () => {
    const item = listItem({ status: "Extracting", approval_status: null, total: null });
    expect(isProcessingRow(item)).toBe(true);
    expect(documentLifecycleLabel(item)).toBe("Extracting");
  });

  test("prefers posting status over approval", () => {
    expect(documentLifecycleLabel(listItem({ gl_posting_status: "POSTED" }))).toBe("Posted");
    expect(documentLifecycleLabel(listItem({ gl_posting_status: "VOIDED" }))).toBe("Voided");
    expect(documentLifecycleLabel(listItem({ approval_status: "pending", total: "100" }))).toBe(
      "Pending"
    );
  });
});

describe("display helpers", () => {
  test("joins a person's name and falls back to the username", () => {
    expect(displayName({ first_name: "Ada", last_name: "Lovelace" })).toBe("Ada Lovelace");
    expect(displayName({ username: "ada" })).toBe("ada");
    expect(displayName(null)).toBe("—");
  });

  test("reads the uploader and vendor", () => {
    expect(uploaderName(listItem({ created_by: " ada " }))).toBe("ada");
    expect(uploaderName(listItem())).toBeNull();
    expect(vendorName(listItem({ party: { id: "p1", name: "Acme" } }))).toBe("Acme");
    expect(vendorName(listItem({ suggested_party: { id: "p2", name: "Suggested Co" } }))).toBe(
      "Suggested Co"
    );
    expect(vendorName(listItem())).toBe("No vendor yet");
  });
});

describe("canActOnApproval", () => {
  test("blocks sales managers, viewers, posted docs, and unfinished processing", () => {
    expect(canActOnApproval(detail(), config, "sales_manager")).toEqual({
      canApprove: false,
      canReject: false,
      reason: "Forwarding for approval is available on the web app.",
    });
    expect(canActOnApproval(detail(), config, "auditor")).toEqual({
      canApprove: false,
      canReject: false,
    });
    expect(
      canActOnApproval(detail({ gl_posting_status: "POSTED" }), config, "accountant").reason
    ).toBe("Posted documents cannot be approved or rejected.");
    expect(
      canActOnApproval(
        detail({ status: "Extracting", approval_status: null, total: null }),
        config,
        "accountant"
      ).reason
    ).toBe("Wait until processing finishes.");
  });

  test("blocks approving your own upload unless self-approve is allowed", () => {
    const own = detail({ created_by: "ada", approval_status: "pending", total: "10" });
    expect(canActOnApproval(own, config, "accountant", "ada").reason).toBe(
      "You cannot approve a document you uploaded."
    );
    expect(canActOnApproval(own, config, "standard_user", "ada")).toEqual({
      canApprove: true,
      canReject: true,
    });
  });

  test("limits actions once a document is already approved or rejected", () => {
    expect(
      canActOnApproval(detail({ approval_status: "approved", total: "10" }), config, "accountant")
    ).toEqual({ canApprove: false, canReject: true });
    expect(
      canActOnApproval(detail({ approval_status: "rejected", total: "10" }), config, "accountant")
    ).toEqual({ canApprove: true, canReject: false });
  });
});
