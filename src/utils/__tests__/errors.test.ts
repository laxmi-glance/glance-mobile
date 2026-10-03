import { AxiosError, AxiosHeaders } from "axios";

import { apiErrorMessage } from "../errors";

function httpError(data: unknown, extras?: { code?: string; message?: string }): AxiosError {
  const error = new AxiosError(extras?.message || "Request failed");
  if (extras?.code) {
    error.code = extras.code;
  }
  error.response = {
    data,
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe("apiErrorMessage", () => {
  test("prefers a string detail", () => {
    expect(apiErrorMessage(httpError({ detail: "Not found." }))).toBe("Not found.");
  });

  test("falls back to a string message", () => {
    expect(apiErrorMessage(httpError({ message: "Workspace is inactive." }))).toBe(
      "Workspace is inactive."
    );
  });

  test("reads the first field validation message", () => {
    expect(
      apiErrorMessage(
        httpError({
          invoice_number: ["This field is required."],
        })
      )
    ).toBe("This field is required.");
  });

  test("explains network failures", () => {
    expect(apiErrorMessage(httpError({}, { code: "ERR_NETWORK", message: "Network Error" }))).toBe(
      "Unable to reach Glancewise. Check your connection."
    );
  });

  test("uses an Error message, then the fallback", () => {
    expect(apiErrorMessage(new Error("Camera permission denied."))).toBe(
      "Camera permission denied."
    );
    expect(apiErrorMessage("nope", "Try again.")).toBe("Try again.");
  });
});
