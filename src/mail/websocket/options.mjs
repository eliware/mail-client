import { isValidCursor } from "./cursor.mjs";

export function validateEventOptions({
  getAccessToken,
  WebSocketImpl,
  onEvent,
  onError,
  consumerId,
  acknowledgeEvent,
  logger,
  retryDelayMs,
  maxReconnectDelayMs,
  after,
}) {
  if (typeof getAccessToken !== "function")
    throw new TypeError("getAccessToken must be a function");
  if (typeof WebSocketImpl !== "function")
    throw new TypeError("WebSocketImpl must be a constructor");
  if (typeof onEvent !== "function") throw new TypeError("onEvent must be a function");
  if (typeof onError !== "function") throw new TypeError("onError must be a function");
  if (
    logger !== undefined &&
    (typeof logger?.debug !== "function" ||
      typeof logger?.warn !== "function" ||
      typeof logger?.error !== "function")
  ) {
    throw new TypeError("logger must provide debug, warn, and error methods");
  }
  if (consumerId !== undefined && (typeof consumerId !== "string" || consumerId.length === 0)) {
    throw new TypeError("consumerId must be a non-empty string");
  }
  if (consumerId !== undefined && typeof acknowledgeEvent !== "function") {
    throw new TypeError("acknowledgeEvent must be a function when consumerId is set");
  }
  if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0) {
    throw new TypeError("retryDelayMs must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(maxReconnectDelayMs) || maxReconnectDelayMs < retryDelayMs) {
    throw new TypeError("maxReconnectDelayMs must be a safe integer at least retryDelayMs");
  }
  if (after !== undefined && !isValidCursor(after)) {
    throw new TypeError("after must be a decimal Snowflake cursor");
  }
  if (after !== undefined && consumerId !== undefined) {
    throw new TypeError("after and consumerId cannot be used together");
  }
}
