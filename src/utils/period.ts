import { getPeriodLabel } from "../config/dashboard";
import type { DashboardPeriod } from "../types/dashboard";

const pad = (n: number) => String(n).padStart(2, "0");

export function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function fyStartOn(onDate: Date): Date {
  const year = onDate.getMonth() >= 3 ? onDate.getFullYear() : onDate.getFullYear() - 1;
  return new Date(year, 3, 1);
}

export function resolvePeriodBounds(period: DashboardPeriod = "fy", onDate = new Date()) {
  const today = startOfDay(onDate);
  let start: Date;
  const end = today;
  let compareStart: Date;
  let compareEnd: Date;

  if (period === "mtd") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevEnd = addDays(start, -1);
    compareStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    compareEnd = addDays(compareStart, Math.round((end.getTime() - start.getTime()) / 86400000));
    if (compareEnd > prevEnd) {
      compareEnd = prevEnd;
    }
  } else if (period === "qtd") {
    const fyStart = fyStartOn(today);
    const monthsFromFy =
      (today.getFullYear() - fyStart.getFullYear()) * 12 + (today.getMonth() - fyStart.getMonth());
    const quarterIndex = Math.floor(monthsFromFy / 3);
    start = new Date(fyStart.getFullYear(), fyStart.getMonth() + quarterIndex * 3, 1);
    compareEnd = addDays(start, -1);
    compareStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
  } else if (period === "30d") {
    start = addDays(end, -29);
    compareEnd = addDays(start, -1);
    compareStart = addDays(compareEnd, -29);
  } else {
    start = fyStartOn(today);
    compareStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
    compareEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  }

  return {
    period,
    label: getPeriodLabel(period),
    startDate: toApiDate(start),
    endDate: toApiDate(end),
    compareStartDate: toApiDate(compareStart),
    compareEndDate: toApiDate(compareEnd),
  };
}
