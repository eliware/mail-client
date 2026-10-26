import { expect, jest, test } from "@jest/globals";
import { createMailClient } from "../src/index.browser.mjs";

test("exports a browser entry without a Node logger dependency", async () => {
  const client = createMailClient({
    baseUrl: "https://mail.example.test",
    getAccessToken: () => "temporary-token",
    fetchImpl: jest.fn(async () => new Response("{}", { status: 200 })),
  });

  await expect(client.request("/api/status")).resolves.toBeInstanceOf(Response);
});
