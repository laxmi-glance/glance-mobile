import {
  formatDrCr,
  formatSideAmount,
  ledgerGroupPath,
  ledgerNature,
  postingStatusLabel,
  postingStatusTone,
  previousIsoDate,
  voucherLabel,
} from "../accounting";
import { formatInr } from "../money";

describe("posting status", () => {
  test("labels known journal statuses", () => {
    expect(postingStatusLabel("POSTED")).toBe("Posted");
    expect(postingStatusLabel("pending")).toBe("Pending");
    expect(postingStatusLabel("")).toBe("Draft");
    expect(postingStatusLabel("custom_state")).toBe("Custom State");
  });

  test("maps status to a badge tone", () => {
    expect(postingStatusTone("POSTED")).toBe("success");
    expect(postingStatusTone("PENDING")).toBe("processing");
    expect(postingStatusTone("VOIDED")).toBe("failed");
    expect(postingStatusTone(null)).toBe("neutral");
  });
});

describe("ledger labels", () => {
  test("joins a parent group and the ledger group", () => {
    expect(
      ledgerGroupPath({
        id: "g1",
        title: "Sundry Debtors",
        parent_group_data: { title: "Current Assets" },
      })
    ).toBe("Current Assets / Sundry Debtors");
  });

  test("falls back when a ledger has no group", () => {
    expect(ledgerGroupPath(null)).toBe("Ungrouped");
    expect(ledgerNature({ nature_of_group: "Assets" })).toBe("Assets");
    expect(
      ledgerNature({ ledger_group: { id: "g", title: "Cash", nature_of_group: "Assets" } })
    ).toBe("Assets");
  });

  test("builds a voucher heading from type and number", () => {
    expect(voucherLabel({ voucher_type: "Payment", voucher_number: "12" })).toBe("Payment 12");
    expect(voucherLabel({ system_voucher_number: "JV-4" })).toBe("Journal JV-4");
  });
});

describe("amounts", () => {
  test("shows debit and credit sides from the signed balance", () => {
    expect(formatDrCr(120)).toBe(`${formatInr(120)} Dr`);
    expect(formatDrCr(-40)).toBe(`${formatInr(40)} Cr`);
    expect(formatDrCr(0)).toBe(formatInr(0));
    expect(formatDrCr(null)).toBe("—");
  });

  test("hides a zero side amount", () => {
    expect(formatSideAmount(0)).toBe("—");
    expect(formatSideAmount("15.5")).toBe(formatInr(15.5));
  });

  test("steps back one calendar day", () => {
    expect(previousIsoDate("2026-04-01")).toBe("2026-03-31");
    expect(previousIsoDate("2024-03-01")).toBe("2024-02-29");
    expect(previousIsoDate("not-a-date")).toBe("not-a-date");
  });
});
