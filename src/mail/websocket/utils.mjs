export function subscribe(socket, name, handler) {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(name, handler);
    return () => socket.removeEventListener?.(name, handler);
  }
  if (typeof socket.on === "function") {
    socket.on(name, handler);
    return () => socket.off?.(name, handler);
  }
  throw new TypeError("WebSocket must support event listeners");
}

export function eventData(value) {
  const data = value?.data ?? value;
  if (typeof data === "string") return data;
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  throw new TypeError("WebSocket frame must contain JSON text");
}

export function socketUrl(baseUrl, cursor) {
  const url = new URL("/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (cursor !== null) url.searchParams.set("after", cursor);
  return url.toString();
}

export function validateEventOptions({
  getAccessToken,
  WebSocketImpl,
  onEvent,
  onError,
  consumerId,
  acknowledgeEvent,
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
  if (after !== undefined && (typeof after !== "string" || !/^\d+$/.test(after))) {
    throw new TypeError("after must be a decimal cursor string");
  }
}
