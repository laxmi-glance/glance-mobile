import { formatDate, formatDateTime, formatDurationSeconds } from "../dates";

describe("formatDate", () => {
  test("returns a dash for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  test("formats a date-only value in the local calendar", () => {
    expect(formatDate("2026-04-03")).toBe(new Date(2026, 3, 3).toLocaleDateString());
  });

  test("returns the original text when it is not a date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  test("returns a dash for empty values", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  test("includes a time for a valid timestamp", () => {
    const value = "2026-04-03T15:04:00";
    const date = new Date(value);
    expect(formatDateTime(value)).toBe(
      `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    );
  });

  test("returns the original text when it is not a date", () => {
    expect(formatDateTime("soon")).toBe("soon");
  });
});

describe("formatDurationSeconds", () => {
  test("returns a dash when the duration is missing", () => {
    expect(formatDurationSeconds(null)).toBe("—");
    expect(formatDurationSeconds(undefined)).toBe("—");
  });

  test("formats sub-minute durations in seconds", () => {
    expect(formatDurationSeconds(12.34)).toBe("12.3s");
  });

  test("formats longer durations in minutes and seconds", () => {
    expect(formatDurationSeconds(90)).toBe("1m 30s");
  });
});
