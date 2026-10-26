import { createWebSocketSession } from "./websocket/session.mjs";
import { socketUrl, validateEventOptions } from "./websocket/utils.mjs";

const noop = () => {};

export function createEventConnection({
  baseUrl,
  getAccessToken,
  acknowledgeEvent,
  WebSocketImpl = globalThis.WebSocket,
  after,
  consumerId,
  onEvent,
  onError = noop,
  autoReconnect = true,
  retryDelayMs = 500,
  maxReconnectDelayMs = 30_000,
} = {}) {
  const options = {
    getAccessToken,
    WebSocketImpl,
    onEvent,
    onError,
    consumerId,
    acknowledgeEvent,
    retryDelayMs,
    maxReconnectDelayMs,
    after,
  };
  validateEventOptions(options);
  let cursor = after ?? null;
  let socket;
  let timer;
  let stopped = false;
  let attempt = 0;
  let authenticated = false;
  let initialSettled = false;
  let processing = Promise.resolve();
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function report(error) {
    try {
      onError(error);
    } catch {}
  }

  function settleReady(error) {
    if (initialSettled) return;
    initialSettled = true;
    if (error) rejectReady(error);
    else resolveReady();
  }

  function scheduleReconnect(code) {
    if (stopped || !autoReconnect || code === 1000 || code === 1008) return;
    const delay = Math.min(retryDelayMs * 2 ** attempt, maxReconnectDelayMs);
    attempt += 1;
    timer = setTimeout(connect, delay);
    timer.unref?.();
  }

  async function processEvent(event) {
    const eventCursor = event.cursor ?? event.event_id;
    if (typeof eventCursor === "string" && cursor !== null) {
      try {
        if (BigInt(eventCursor) <= BigInt(cursor)) return;
      } catch {
        throw new TypeError("event cursor must be a decimal string");
      }
    }
    await onEvent(event);
    if (typeof eventCursor === "string") {
      if (consumerId !== undefined) await acknowledgeEvent(consumerId, eventCursor);
      cursor = eventCursor;
    }
  }

  async function connect() {
    if (stopped) return;
    authenticated = false;
    try {
      const token = await getAccessToken();
      if (typeof token !== "string" || token.length === 0) {
        throw new TypeError("getAccessToken must return a non-empty bearer token");
      }
      socket = createWebSocketSession({
        url: socketUrl(baseUrl, cursor),
        token,
        WebSocketImpl,
        onAuthenticated: () => {
          authenticated = true;
          attempt = 0;
          settleReady();
        },
        onEvent: (event) => {
          processing = processing
            .then(() => processEvent(event))
            .catch((error) => {
              report(error);
              socket.close(1011, "event processing failed");
            });
        },
        onClose: (code) => {
          if (!authenticated)
            settleReady(new Error(`WebSocket authentication closed with code ${code}`));
          scheduleReconnect(code);
        },
        onError: report,
      });
    } catch (error) {
      report(error);
      settleReady(error);
      scheduleReconnect(1006);
    }
  }

  void connect();
  return {
    ready,
    get cursor() {
      return cursor;
    },
    close() {
      stopped = true;
      if (timer) clearTimeout(timer);
      settleReady(new Error("WebSocket connection closed by the client"));
      socket?.close(1000, "client closed");
    },
  };
}
