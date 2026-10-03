import type { PreprocessingDocument } from "../../types/models";
import { lightColors } from "../../theme/colors";
import { canRetry, statusColor, statusTone } from "../documentStatus";

function doc(overrides: Partial<PreprocessingDocument> = {}): PreprocessingDocument {
  return {
    id: "pre-1",
    file_name: "invoice.pdf",
    is_completed: false,
    is_processing: false,
    failure_count: 0,
    processing_status_display: "Queued",
    created_on: "2026-04-03T00:00:00Z",
    ...overrides,
  };
}

describe("statusTone", () => {
  test("marks failures, completions, processing, and the queue", () => {
    expect(statusTone(doc({ failure_count: 1 }))).toBe("failed");
    expect(statusTone(doc({ is_invalid_file: true }))).toBe("failed");
    expect(statusTone(doc({ is_completed: true, processing_status_display: "Completed" }))).toBe(
      "success"
    );
    expect(statusTone(doc({ is_processing: true, processing_status_display: "Processing" }))).toBe(
      "processing"
    );
    expect(statusTone(doc({ processing_status_display: "Queued" }))).toBe("queued");
    expect(statusTone(doc({ processing_status_display: "Waiting" }))).toBe("neutral");
  });
});

describe("statusColor", () => {
  test("maps each tone onto the palette", () => {
    expect(statusColor("success")).toBe(lightColors.success);
    expect(statusColor("processing")).toBe(lightColors.processing);
    expect(statusColor("failed")).toBe(lightColors.danger);
    expect(statusColor("queued")).toBe(lightColors.queued);
    expect(statusColor("neutral")).toBe(lightColors.textMuted);
  });
});

describe("canRetry", () => {
  test("does not retry a completed duplicate or a clean completion", () => {
    expect(
      canRetry(
        doc({
          is_completed: true,
          duplicate_of: { id: "other" },
          financial_document: { id: "fin-1" },
        })
      )
    ).toBe(false);
    expect(canRetry(doc({ is_completed: true, processing_status_display: "Completed" }))).toBe(
      false
    );
  });

  test("allows retry after a failure, error log, or invalid file", () => {
    expect(canRetry(doc({ failure_count: 2 }))).toBe(true);
    expect(canRetry(doc({ error_log: "timeout" }))).toBe(true);
    expect(canRetry(doc({ is_invalid_file: true }))).toBe(true);
    expect(canRetry(doc({ processing_status_display: "Issue found" }))).toBe(true);
  });
});
