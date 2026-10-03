import { getVisibleSections, isDefaultLayoutConfig, parseLayoutConfig } from "../dashboardLayout";

const defaults = ["notifications", "myWork", "operations", "cashPosition", "plSnapshot"];

describe("parseLayoutConfig", () => {
  test("keeps the default order and hides sections outside the home set", () => {
    const config = parseLayoutConfig(null, defaults);
    expect(config.order).toEqual(defaults);
    expect(config.hidden).toEqual(["cashPosition", "plSnapshot"]);
    expect(isDefaultLayoutConfig(config, defaults)).toBe(true);
  });

  test("maps retired section ids onto the widgets that replaced them", () => {
    const config = parseLayoutConfig(
      {
        order: ["unreadNotifications", "pendingApprovals", "operations"],
        hidden: ["bankBalances"],
      },
      defaults
    );
    expect(config.order).toEqual(defaults);
    expect(config.hidden).toEqual(["cashPosition"]);
    expect(getVisibleSections(config)).toEqual([
      "notifications",
      "myWork",
      "operations",
      "plSnapshot",
    ]);
  });

  test("expands a legacy group and drops unknown widgets", () => {
    const config = parseLayoutConfig(["financial", "not-a-widget"], defaults);
    expect(config.order).toEqual([
      "plSnapshot",
      "cashPosition",
      "notifications",
      "myWork",
      "operations",
    ]);
    expect(config.hidden).toEqual([]);
  });
});
