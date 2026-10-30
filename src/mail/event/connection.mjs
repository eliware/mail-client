import { createWebSocketSession } from "../websocket/session.mjs";
import { socketUrl } from "../websocket/address.mjs";
import { validateEventOptions } from "../websocket/options.mjs";
import { createEventConnectionLogger } from "./connection-logging.mjs";
import { createEventProcessor } from "./processor.mjs";
import { createReadyState } from "../ready-state.mjs";

export function createEventConnection({
  baseUrl,
  getAccessToken,
  acknowledgeEvent,
  WebSocketImpl = globalThis.WebSocket,
  after,
  consumerId,
  onEvent,
  onError = () => {},
  autoReconnect = true,
  retryDelayMs = 500,
  maxReconnectDelayMs = 30_000,
  logger,
} = {}) {
  const logs = createEventConnectionLogger(logger);
  validateEventOptions({
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
  });
  let cursor = after ?? null;
  let socket;
  let timer;
  let stopped = false;
  let attempt = 0;
  let authenticated = false;
  let processing = Promise.resolve();
  const { ready, settle: settleReady } = createReadyState();

  function report(error) {
    try {
      onError(error);
    } catch {}
  }

  function scheduleReconnect(code) {
    if (stopped || !autoReconnect || code === 1000 || code === 1008) return;
    const delay = Math.min(retryDelayMs * 2 ** attempt, maxReconnectDelayMs);
    attempt += 1;
    logs.reconnectScheduled(code, delay, attempt, cursor);
    timer = setTimeout(connect, delay);
    timer.unref?.();
  }

  const processEvent = createEventProcessor({
    getCursor: () => cursor,
    setCursor: (value) => {
      cursor = value;
    },
    consumerId,
    acknowledgeEvent,
    onEvent,
    logs,
  });

  async function connect() {
    if (stopped) return;
    authenticated = false;
    logs.started(cursor);
    let token;
    try {
      token = await getAccessToken();
    } catch (error) {
      if (stopped) return;
      logs.tokenProviderFailed(error);
      report(error);
      settleReady(error);
      scheduleReconnect(1006);
      return;
    }
    if (stopped) return;
    if (typeof token !== "string" || token.length === 0) {
      const error = new TypeError("getAccessToken must return a non-empty bearer token");
      stopped = true;
      logs.invalidToken();
      report(error);
      settleReady(error);
      return;
    }
    try {
      socket = createWebSocketSession({
        url: socketUrl(baseUrl, cursor),
        token,
        WebSocketImpl,
        onAuthenticated: () => {
          authenticated = true;
          attempt = 0;
          logs.authenticated(cursor);
          settleReady();
        },
        onEvent: (event) => {
          processing = processing
            .then(() => processEvent(event))
            .catch((error) => {
              logs.eventFailed(event, error);
              report(error);
              stopped = true;
              settleReady(error);
              socket.close(1011, "event processing failed");
            });
        },
        onClose: (code) => {
          logs.closed(code, authenticated, cursor);
          if (!authenticated)
            settleReady(new Error(`WebSocket authentication closed with code ${code}`));
          scheduleReconnect(code);
        },
        onError: (error) => {
          logs.socketFailed(error);
          report(error);
        },
      });
    } catch (error) {
      stopped = true;
      logs.startFailed(error);
      report(error);
      settleReady(error);
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
      logs.clientClosed(cursor);
      settleReady(new Error("WebSocket connection closed by the client"));
      socket?.close(1000, "client closed");
    },
  };
}
