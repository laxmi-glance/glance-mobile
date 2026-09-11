import { lightColors, type AppColors } from "../theme/colors";
import type { PreprocessingDocument } from "../types/models";

export type StatusTone = "success" | "processing" | "failed" | "queued" | "neutral";

export function statusTone(doc: PreprocessingDocument): StatusTone {
  const label = (doc.processing_status_display || "").toLowerCase();
  if (doc.duplicate_of || label.includes("issue") || doc.failure_count > 0 || doc.is_invalid_file) {
    return "failed";
  }
  if (doc.is_completed || label === "completed") {
    return "success";
  }
  if (doc.is_processing || label.includes("processing") || label.includes("almost")) {
    return "processing";
  }
  if (label === "queued") {
    return "queued";
  }
  return "neutral";
}

export function statusColor(tone: StatusTone, palette: AppColors = lightColors): string {
  switch (tone) {
    case "success":
      return palette.success;
    case "processing":
      return palette.processing;
    case "failed":
      return palette.danger;
    case "queued":
      return palette.queued;
    default:
      return palette.textMuted;
  }
}

export function canRetry(doc: PreprocessingDocument): boolean {
  if (doc.financial_document && doc.duplicate_of) {
    return false;
  }
  if (doc.is_completed && doc.failure_count === 0 && !doc.error_log && !doc.exception_log) {
    return false;
  }
  return (
    doc.failure_count > 0 ||
    Boolean(doc.error_log) ||
    Boolean(doc.exception_log) ||
    doc.processing_status_display === "Issue found" ||
    Boolean(doc.is_invalid_file)
  );
}
