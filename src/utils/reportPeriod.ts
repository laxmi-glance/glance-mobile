import { toApiDate } from "./period";
import type {
  FiscalYearBounds,
  ReportDateMode,
  ReportPreset,
  ReportPresetId,
} from "../types/reports";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseReportDate(value?: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function endOfQuarter(date: Date): Date {
  const start = startOfQuarter(date);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0);
}

function shiftYear(date: Date, years: number): Date {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

function calendarFiscalYear(onDate: Date): { start: Date; end: Date } {
  const year = onDate.getMonth() >= 3 ? onDate.getFullYear() : onDate.getFullYear() - 1;
  return {
    start: new Date(year, 3, 1),
    end: new Date(year + 1, 2, 31),
  };
}

function fiscalBounds(onDate: Date, fiscalYear?: FiscalYearBounds | null) {
  const start = parseReportDate(fiscalYear?.startDate);
  const end = parseReportDate(fiscalYear?.endDate);
  if (start && end && start.getTime() <= end.getTime()) {
    return { start, end };
  }
  return calendarFiscalYear(onDate);
}

function span(id: ReportPresetId, label: string, start: Date, end: Date): ReportPreset {
  const from = start.getTime() <= end.getTime() ? start : end;
  const to = start.getTime() <= end.getTime() ? end : start;
  return {
    id,
    label,
    startDate: toApiDate(from),
    endDate: toApiDate(to),
  };
}

function day(id: ReportPresetId, label: string, date: Date): ReportPreset {
  const iso = toApiDate(date);
  return { id, label, startDate: iso, endDate: iso };
}

export function buildReportPresets(
  mode: ReportDateMode,
  onDate = new Date(),
  fiscalYear?: FiscalYearBounds | null
): ReportPreset[] {
  const today = startOfDay(onDate);
  const fy = fiscalBounds(today, fiscalYear);
  const previousStart = shiftYear(fy.start, -1);
  const previousEnd = shiftYear(fy.end, -1);
  const fyToDateEnd = today.getTime() > fy.end.getTime() ? fy.end : today;
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);
  const quarterStart = startOfQuarter(today);
  const previousWeek = addDays(weekStart, -7);
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousQuarter = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - 3, 1);

  if (mode === "date") {
    return [
      day("current-fy", "Current Fiscal Year", fy.end),
      day("previous-fy", "Previous Fiscal Year", previousEnd),
      day("today", "Today", today),
      day("this-week", "This Week", endOfWeek(today)),
      day("this-month", "This Month", endOfMonth(today)),
      day("this-quarter", "This Quarter", endOfQuarter(today)),
      day("this-year", "This Year", new Date(today.getFullYear(), 11, 31)),
      day("yesterday", "Yesterday", addDays(today, -1)),
      day("previous-week", "Previous Week", endOfWeek(previousWeek)),
      day("previous-month", "Previous Month", endOfMonth(previousMonth)),
      day("previous-quarter", "Previous Quarter", endOfQuarter(previousQuarter)),
      day("previous-year", "Previous Year", new Date(today.getFullYear() - 1, 11, 31)),
    ];
  }

  return [
    span("current-fy", "Current Fiscal Year", fy.start, fy.end),
    span(
      "fy-to-date",
      "Financial Year To Date",
      fy.start,
      fyToDateEnd.getTime() < fy.start.getTime() ? fy.start : fyToDateEnd
    ),
    span("previous-fy", "Previous Financial Year", previousStart, previousEnd),
    span("today", "Today", today, today),
    span("this-week", "This Week", weekStart, endOfWeek(today)),
    span("this-month", "This Month", monthStart, endOfMonth(today)),
    span("this-quarter", "This Quarter", quarterStart, endOfQuarter(today)),
    span("yesterday", "Yesterday", addDays(today, -1), addDays(today, -1)),
    span("previous-week", "Previous Week", previousWeek, endOfWeek(previousWeek)),
    span("previous-month", "Previous Month", previousMonth, endOfMonth(previousMonth)),
    span("previous-quarter", "Previous Quarter", previousQuarter, endOfQuarter(previousQuarter)),
  ];
}
