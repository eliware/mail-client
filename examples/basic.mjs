import { createMailClient } from "../src/index.mjs";

const mail = createMailClient({
  baseUrl: process.env.MAIL_API_URL ?? "https://mail.example.test",
  getAccessToken: () => process.env.MAIL_API_TOKEN ?? "replace-with-a-local-token",
});

const response = await mail.request("/api/status");
console.log(await response.json());
