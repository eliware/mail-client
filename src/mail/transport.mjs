import { MailApiError } from "./api/error.mjs";
import { normalizeBaseUrl } from "./transport/base-url.mjs";

const defaultTimeoutMs = 15_000;
const noOperation = () => {};
const silentLogger = { debug: noOperation, warn: noOperation, error: noOperation };

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function errorPayload(response) {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return null;
    }
  }
}

export function createTransport({
  baseUrl,
  getAccessToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = defaultTimeoutMs,
  logger = silentLogger,
} = {}) {
  const apiOrigin = normalizeBaseUrl(baseUrl);
  if (typeof getAccessToken !== "function") {
    throw new TypeError("getAccessToken must be a function");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError("timeoutMs must be a positive safe integer");
  }
  if (
    typeof logger?.debug !== "function" ||
    typeof logger?.warn !== "function" ||
    typeof logger?.error !== "function"
  ) {
    throw new TypeError("logger must provide debug, warn, and error methods");
  }

  async function request(path, options = {}) {
    if (typeof path !== "string" || path.length === 0) {
      throw new TypeError("path must be a non-empty string");
    }
    const url = new URL(path, `${apiOrigin}/`);
    if (url.origin !== apiOrigin) throw new TypeError("path must use the configured API origin");

    const method = String(options.method ?? "GET").toUpperCase();
    const startedAt = Date.now();
    logger.debug("Mail API request started", { method });
    let token;
    try {
      token = await getAccessToken();
    } catch (error) {
      logger.error("Mail API access token provider failed", {
        method,
        durationMs: Date.now() - startedAt,
        errorName: typeof error?.name === "string" ? error.name : "Error",
      });
      throw error;
    }
    if (typeof token !== "string" || token.length === 0) {
      logger.error("Mail API access token provider returned an invalid token", {
        method,
        durationMs: Date.now() - startedAt,
      });
      throw new TypeError("getAccessToken must return a non-empty bearer token");
    }

    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${token}`);
    const body = options.body;
    const isJsonBody = isPlainObject(body);
    const requestBody = isJsonBody ? JSON.stringify(body) : body;
    if (isJsonBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    let response;
    try {
      response = await fetchImpl(url, { ...options, method, headers, body: requestBody, signal });
    } catch (error) {
      logger.error("Mail API request failed", {
        method,
        durationMs: Date.now() - startedAt,
        errorName: typeof error?.name === "string" ? error.name : "Error",
      });
      throw error;
    }
    if (!response.ok) {
      const error = new MailApiError(
        response.status,
        await errorPayload(response),
        response.headers,
      );
      logger.warn("Mail API request failed", {
        method,
        status: error.status,
        durationMs: Date.now() - startedAt,
        code: error.code,
        requestId: error.requestId,
      });
      throw error;
    }
    logger.debug("Mail API request completed", {
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestId: response.headers.get("x-request-id"),
    });
    return response;
  }

  async function requestJson(path, options) {
    return (await request(path, options)).json();
  }

  return { request, requestJson, baseUrl: apiOrigin };
}
