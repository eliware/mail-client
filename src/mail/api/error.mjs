export class MailApiError extends Error {
  constructor(status, payload, headers) {
    const apiError = payload?.error;
    super(apiError?.message ?? `Mail API request failed with HTTP ${status}`);
    this.name = "MailApiError";
    this.status = status;
    this.code = apiError?.code ?? "MAIL_API_ERROR";
    this.requestId = payload?.request_id ?? headers?.get?.("x-request-id") ?? null;
    this.payload = payload;
  }
}
