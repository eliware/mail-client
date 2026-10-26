import { expect, jest, test } from "@jest/globals";
import { createMailClient, MailApiError } from "../src/index.mjs";

test("exports the public client and error types", async () => {
  const mail = createMailClient({
    baseUrl: "https://mail.example.test",
    getAccessToken: () => "token",
    fetchImpl: jest.fn(async () => new Response("{}", { status: 200 })),
  });

  await expect(mail.request("/api/status")).resolves.toBeInstanceOf(Response);
  expect(new MailApiError(401, null)).toBeInstanceOf(Error);
});
