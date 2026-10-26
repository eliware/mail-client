import { expect, test } from "@jest/globals";
import { MailApiError } from "../../../src/mail/api/error.mjs";

test("preserves API error details", () => {
  const error = new MailApiError(403, {
    error: { code: "FORBIDDEN", message: "Access denied" },
    request_id: "request-1",
  });

  expect(error.message).toBe("Access denied");
  expect(error.status).toBe(403);
  expect(error.code).toBe("FORBIDDEN");
  expect(error.requestId).toBe("request-1");
});

test("uses safe defaults for incomplete API errors", () => {
  const error = new MailApiError(500, null);

  expect(error.message).toBe("Mail API request failed with HTTP 500");
  expect(error.code).toBe("MAIL_API_ERROR");
  expect(error.requestId).toBeNull();
});

test("reads a request ID from the response headers", () => {
  const error = new MailApiError(503, null, new Headers({ "x-request-id": "header-request" }));
  expect(error.requestId).toBe("header-request");
});
