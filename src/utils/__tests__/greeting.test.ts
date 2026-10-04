import { getDisplayFirstName, getGreeting } from "../greeting";

describe("getGreeting", () => {
  test("follows the time of day", () => {
    expect(getGreeting(new Date(2026, 3, 3, 8))).toBe("Good morning");
    expect(getGreeting(new Date(2026, 3, 3, 13))).toBe("Good afternoon");
    expect(getGreeting(new Date(2026, 3, 3, 18))).toBe("Good evening");
  });
});

describe("getDisplayFirstName", () => {
  test("prefers the first name", () => {
    expect(getDisplayFirstName({ first_name: "  Ada ", username: "ada.lovelace" })).toBe("Ada");
  });

  test("derives a name from the username", () => {
    expect(getDisplayFirstName({ username: "ada.lovelace" })).toBe("Ada");
    expect(getDisplayFirstName({ username: "grace_hopper" })).toBe("Grace");
  });

  test("falls back when nothing usable is present", () => {
    expect(getDisplayFirstName(null)).toBe("there");
    expect(getDisplayFirstName({ username: "@" })).toBe("there");
  });
});
