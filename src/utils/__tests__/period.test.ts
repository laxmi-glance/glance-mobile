import { resolvePeriodBounds, toApiDate } from "../period";

describe("toApiDate", () => {
  test("formats a local calendar date", () => {
    expect(toApiDate(new Date(2026, 3, 3))).toBe("2026-04-03");
  });
});

describe("resolvePeriodBounds", () => {
  const onDate = new Date(2026, 5, 15);

  test("uses the financial year that starts in April", () => {
    expect(resolvePeriodBounds("fy", onDate)).toMatchObject({
      label: "FY to date",
      startDate: "2026-04-01",
      endDate: "2026-06-15",
      compareStartDate: "2025-04-01",
      compareEndDate: "2025-06-15",
    });
  });

  test("compares month to date with the previous month", () => {
    expect(resolvePeriodBounds("mtd", onDate)).toMatchObject({
      label: "Month to date",
      startDate: "2026-06-01",
      endDate: "2026-06-15",
      compareStartDate: "2026-05-01",
      compareEndDate: "2026-05-15",
    });
  });

  test("uses the financial-year quarter", () => {
    expect(resolvePeriodBounds("qtd", onDate)).toMatchObject({
      startDate: "2026-04-01",
      endDate: "2026-06-15",
      compareStartDate: "2026-01-01",
      compareEndDate: "2026-03-31",
    });
    expect(resolvePeriodBounds("qtd", new Date(2026, 0, 15))).toMatchObject({
      startDate: "2026-01-01",
      endDate: "2026-01-15",
      compareStartDate: "2025-10-01",
      compareEndDate: "2025-12-31",
    });
  });

  test("covers the last 30 days inclusive", () => {
    expect(resolvePeriodBounds("30d", onDate)).toMatchObject({
      label: "Last 30 days",
      startDate: "2026-05-17",
      endDate: "2026-06-15",
      compareStartDate: "2026-04-17",
      compareEndDate: "2026-05-16",
    });
  });
});
