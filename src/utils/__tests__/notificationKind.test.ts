import { isErrorNotification, isInErrorsTab, isInGeneralTab } from "../notificationKind";

describe("notificationKind", () => {
  test("classifies data integrity and failure titles as errors", () => {
    expect(isErrorNotification({ category: "data_integrity" })).toBe(true);
    expect(isErrorNotification({ title: "Sync failed" })).toBe(true);
    expect(isErrorNotification({ severity: "critical" })).toBe(true);
    expect(isErrorNotification({ type: "connector_tally_unreachable" })).toBe(true);
    expect(isErrorNotification({ title: "Invoice processed", type: "info" })).toBe(false);
    expect(isErrorNotification({ type: "connector_connected" })).toBe(false);
  });

  test("keeps resolved errors on the errors panel", () => {
    expect(isInErrorsTab({ category: "data_integrity", resolved: true })).toBe(true);
    expect(isInErrorsTab({ category: "data_integrity", resolved: false })).toBe(true);
    expect(isInGeneralTab({ title: "Invoice processed" })).toBe(true);
  });

  test("puts every notification in exactly one panel", () => {
    const samples = [
      { title: "Invoice processed" },
      { category: "data_integrity", resolved: false },
      { category: "data_integrity", resolved: true },
      { title: "Sync failed", resolved_at: "2026-04-02T10:00:00Z" },
    ];
    samples.forEach((item) => expect(isInErrorsTab(item) !== isInGeneralTab(item)).toBe(true));
  });
});
