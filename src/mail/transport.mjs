import { MailApiError } from "./api/error.mjs";

const defaultTimeoutMs = 15_000;
const noOperation = () => {};
const silentLogger = { debug: noOperation, warn: noOperation, error: noOperation };

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("baseUrl must be a valid URL");
  }
  if (!/^https?:$/.test(url.protocol)) throw new TypeError("baseUrl must use HTTP or HTTPS");
  if (url.pathname !== "/" || url.username || url.password || url.search || url.hash) {
    throw new TypeError("baseUrl must be an HTTP origin without credentials or extra components");
  }
  return url.origin;
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

    const token = await getAccessToken();
    if (typeof token !== "string" || token.length === 0) {
      throw new TypeError("getAccessToken must return a non-empty bearer token");
    }

    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${token}`);
    const body = options.body;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    let requestBody = body;
    if (body !== undefined && typeof body === "object" && body !== null && !isFormData) {
      requestBody = JSON.stringify(body);
    }
    if (requestBody !== undefined && !isFormData && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    const method = String(options.method ?? "GET").toUpperCase();
    let response;
    try {
      response = await fetchImpl(url, { ...options, method, headers, body: requestBody, signal });
    } catch (error) {
      logger.error("Mail API request failed", { method, errorName: error?.name ?? "Error" });
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
        code: error.code,
        requestId: error.requestId,
      });
      throw error;
    }
    logger.debug("Mail API request completed", {
      method,
      status: response.status,
      requestId: response.headers.get("x-request-id"),
    });
    return response;
  }

  async function requestJson(path, options) {
    return (await request(path, options)).json();
  }

  return { request, requestJson, baseUrl: apiOrigin };
}
