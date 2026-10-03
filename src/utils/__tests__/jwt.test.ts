import { decodeJwtPayload, userIdFromAccessToken } from "../jwt";

function tokenFor(payload: Record<string, unknown>): string {
  const part = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${part}.signature`;
}

describe("decodeJwtPayload", () => {
  test("reads the payload segment", () => {
    const token = tokenFor({ user_id: "user-1", username: "ada", role: "accountant" });
    expect(decodeJwtPayload(token)).toEqual({
      user_id: "user-1",
      username: "ada",
      role: "accountant",
    });
  });

  test("returns null for a malformed token", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("header.%%%.signature")).toBeNull();
  });
});

describe("userIdFromAccessToken", () => {
  test("returns null when the token is missing", () => {
    expect(userIdFromAccessToken(null)).toBeNull();
    expect(userIdFromAccessToken(undefined)).toBeNull();
    expect(userIdFromAccessToken("")).toBeNull();
  });

  test("returns the user id when it is a non-empty string", () => {
    expect(userIdFromAccessToken(tokenFor({ user_id: "user-1" }))).toBe("user-1");
  });

  test("returns null when user_id is missing or blank", () => {
    expect(userIdFromAccessToken(tokenFor({ username: "ada" }))).toBeNull();
    expect(userIdFromAccessToken(tokenFor({ user_id: "" }))).toBeNull();
    expect(userIdFromAccessToken(tokenFor({ user_id: 12 }))).toBeNull();
  });
});
