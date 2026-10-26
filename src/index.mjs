import defaultLogger from "@eliware/log";
import { createMailClient as createClient } from "./mail/client.mjs";

export function createMailClient(options) {
  return createClient({ ...options, logger: options?.logger ?? defaultLogger });
}

export { MailApiError } from "./mail/api/error.mjs";
