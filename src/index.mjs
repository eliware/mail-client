import { createLogger } from "@eliware/common";
import { createMailClient as createClient } from "./mail/client.mjs";

const defaultLogger = createLogger({
  level: process.env.MAIL_CLIENT_LOG_LEVEL ?? process.env.LOG_LEVEL ?? "info",
  format: "json",
  timestamp: true,
  keys: ["token", "access_token", "authorization", "body", "payload", "attachments"],
});

export function createMailClient(options) {
  return createClient({ ...options, logger: options?.logger ?? defaultLogger });
}

export { MailApiError } from "./mail/api/error.mjs";
