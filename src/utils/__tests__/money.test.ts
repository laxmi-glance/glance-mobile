import { formatInr, formatMoney, humanizeKey } from "../money";

describe("formatMoney", () => {
  test("returns a dash for empty values", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("")).toBe("—");
  });

  test("returns the original text when the amount is not a number", () => {
    expect(formatMoney("not-a-number")).toBe("not-a-number");
  });

  test("formats a numeric amount with the runtime currency formatter", () => {
    expect(formatMoney(1234.5, "INR")).toBe(
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(1234.5)
    );
  });
});

describe("formatInr", () => {
  test("returns a dash for empty values", () => {
    expect(formatInr(null)).toBe("—");
    expect(formatInr("")).toBe("—");
  });

  test("uses Indian grouping for standard amounts", () => {
    expect(formatInr(1234567.5)).toBe(
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        notation: "standard",
        maximumFractionDigits: 2,
      }).format(1234567.5)
    );
  });

  test("uses compact Indian notation", () => {
    expect(formatInr(1234567, true)).toBe(
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(1234567)
    );
  });
});

describe("humanizeKey", () => {
  test("returns a dash for empty values", () => {
    expect(humanizeKey(null)).toBe("—");
    expect(humanizeKey("")).toBe("—");
  });

  test("turns snake case into title case", () => {
    expect(humanizeKey("purchase_invoice")).toBe("Purchase Invoice");
  });
});
