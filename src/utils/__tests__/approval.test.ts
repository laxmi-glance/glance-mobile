import type {
  ApprovalTrail,
  FinancialDocumentDetail,
  FinancialDocumentListItem,
  RbacConfig,
} from "../../types/models";
import {
  applyApprovalTrail,
  approvalLabel,
  approvalProgressLine,
  approvalStepRows,
  canActOnApproval,
  currentApprovalRun,
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
    sales_manager: {
      financial_document: ["approve", "view_ap", "view_ar", "view_own"],
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
  test("blocks viewers, posted docs, and unfinished processing", () => {
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

  test("lets a sales manager approve someone else's document", () => {
    expect(
      canActOnApproval(detail({ approval_status: "pending", total: "10" }), config, "sales_manager")
    ).toEqual({
      canApprove: true,
      canReject: true,
    });
    expect(
      canActOnApproval(
        detail({ created_by: "ada", approval_status: "pending", total: "10" }),
        config,
        "sales_manager",
        "ada"
      ).reason
    ).toBe("You cannot approve a document you uploaded.");
  });

  test("self-approve alone does not approve someone else's document", () => {
    expect(
      canActOnApproval(
        detail({ created_by: "other", approval_status: "pending", total: "10" }),
        config,
        "standard_user",
        "ada"
      )
    ).toEqual({
      canApprove: false,
      canReject: false,
    });
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

describe("approval trail", () => {
  const person = (id: string, name: string) => ({ id, name });
  const both = { canApprove: true, canReject: true };

  function trail(overrides: Partial<ApprovalTrail> = {}): ApprovalTrail {
    return {
      approval_status: "pending",
      governed_by_policy: true,
      can_decide: false,
      is_override: false,
      current_step: { sequence: 2, total_steps: 3, name: "", mode: "any" },
      waiting_for: [person("u-c", "Chen"), person("u-d", "Dev")],
      runs: [
        {
          id: "r-1",
          policy_name: "Large purchases",
          status: "in_progress",
          steps: [
            {
              id: "s-1",
              sequence: 1,
              name: "Accounts",
              mode: "all",
              status: "approved",
              assignments: [
                {
                  id: "a-1",
                  approver: person("u-a", "Asha"),
                  status: "approved",
                  source: "policy",
                },
              ],
            },
            {
              id: "s-2",
              sequence: 2,
              name: "",
              mode: "any",
              status: "pending",
              assignments: [
                { id: "a-2", approver: person("u-c", "Chen"), status: "pending", source: "policy" },
                { id: "a-3", approver: person("u-d", "Dev"), status: "pending", source: "policy" },
              ],
            },
            { id: "s-3", sequence: 3, name: "", mode: "all", status: "waiting", assignments: [] },
          ],
        },
      ],
      ...overrides,
    };
  }

  it("blocks a pending document that is waiting for someone else, and says who", () => {
    const gate = applyApprovalTrail(both, detail({ approval_status: "pending" }), trail());
    expect(gate).toEqual({ canApprove: false, canReject: false, reason: "Waiting for Chen, Dev." });
  });

  it("offers the decision when the server says it is the turn of this user", () => {
    const denied = { canApprove: false, canReject: false };
    const gate = applyApprovalTrail(
      denied,
      detail({ approval_status: "pending" }),
      trail({ can_decide: true })
    );
    expect(gate).toEqual(both);
  });

  it("leaves the role-based gate alone without a trail or once the document is decided", () => {
    const gate = { canApprove: false, canReject: true };
    expect(applyApprovalTrail(gate, detail({ approval_status: "pending" }), null)).toBe(gate);
    expect(applyApprovalTrail(gate, detail({ approval_status: "approved" }), trail())).toBe(gate);
    expect(
      applyApprovalTrail(
        gate,
        detail({ approval_status: "pending", gl_posting_status: "POSTED" }),
        trail()
      )
    ).toBe(gate);
  });

  it("describes the current step and every step of the run", () => {
    expect(approvalProgressLine(trail())).toBe("Step 2 of 3: waiting for any one of Chen, Dev");
    expect(
      approvalProgressLine(trail({ current_step: null, waiting_for: [person("u-b", "Bina")] }))
    ).toBe("Waiting for Bina");
    expect(approvalProgressLine(trail({ waiting_for: [] }))).toBeNull();
    expect(approvalProgressLine(null)).toBeNull();

    expect(approvalStepRows(trail())).toEqual([
      { label: "Step 1: Accounts", value: "Approved by Asha" },
      { label: "Step 2", value: "Waiting for Chen, Dev" },
      { label: "Step 3", value: "Not started" },
    ]);
    expect(approvalStepRows(trail({ runs: [] }))).toEqual([]);
  });
});

describe("approval trail edge cases", () => {
  const person = (id: string, name: string) => ({ id, name });
  const base: ApprovalTrail = {
    approval_status: "pending",
    governed_by_policy: true,
    can_decide: false,
    is_override: false,
    current_step: { sequence: 1, total_steps: 1, name: "", mode: "all" },
    waiting_for: [],
    runs: [],
  };
  const run = (status: "in_progress" | "approved" | "rejected" | "cancelled") => ({
    id: "r-1",
    policy_name: "Large purchases",
    status,
    steps: [
      {
        id: "s-1",
        sequence: 1,
        name: "",
        mode: "all" as const,
        status: "pending" as const,
        assignments: [
          {
            id: "a-1",
            approver: person("u-a", "Asha"),
            status: "approved" as const,
            source: "policy" as const,
          },
          {
            id: "a-2",
            approver: person("u-b", "Bina"),
            status: "pending" as const,
            source: "policy" as const,
          },
          {
            id: "a-3",
            approver: person("u-c", "Chen"),
            status: "replaced" as const,
            source: "policy" as const,
          },
        ],
      },
    ],
  });

  it("always gives a reason when the server says no", () => {
    const gate = applyApprovalTrail(
      { canApprove: true, canReject: true },
      { id: "doc-1", created_on: "2026-04-03T00:00:00Z", approval_status: "pending" },
      base
    );
    expect(gate.canApprove).toBe(false);
    expect(gate.reason).toBe("This document is not waiting for your decision.");
  });

  it("does not let the server widen the gate for a posted document", () => {
    const denied = { canApprove: false, canReject: false, reason: "Posted" };
    const gate = applyApprovalTrail(
      denied,
      {
        id: "doc-1",
        created_on: "2026-04-03T00:00:00Z",
        approval_status: "pending",
        gl_posting_status: "POSTED",
      },
      { ...base, can_decide: true }
    );
    expect(gate).toBe(denied);
  });

  it("words an all-must step and shows who has already approved", () => {
    const trail = {
      ...base,
      waiting_for: [person("u-b", "Bina"), person("u-d", "Dev")],
      runs: [run("in_progress")],
    };
    expect(approvalProgressLine(trail)).toBe("Step 1 of 1: waiting for all of Bina, Dev");
    expect(approvalStepRows(trail)).toEqual([
      { label: "Step 1", value: "Waiting for Bina (approved by Asha)" },
    ]);
  });

  it("only shows a finished run while it still explains the document", () => {
    expect(currentApprovalRun({ ...base, runs: [run("cancelled")] })).toBeNull();
    expect(
      currentApprovalRun({ ...base, approval_status: "rejected", runs: [run("approved")] })
    ).toBeNull();
    expect(
      currentApprovalRun({ ...base, approval_status: "approved", runs: [run("approved")] })?.id
    ).toBe("r-1");
    expect(approvalStepRows({ ...base, runs: [run("cancelled")] })).toEqual([]);
  });
});
