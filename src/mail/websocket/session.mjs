import { eventData } from "./frames.mjs";
import { subscribe } from "./listeners.mjs";

export function createWebSocketSession({
  url,
  token,
  WebSocketImpl,
  onAuthenticated,
  onEvent,
  onClose,
  onError,
}) {
  const socket = new WebSocketImpl(url);
  let authenticated = false;
  subscribe(socket, "open", () => {
    socket.send(JSON.stringify({ type: "authenticate", token }));
  });
  subscribe(socket, "message", (value, isBinary = false) => {
    if (isBinary) {
      onError(new TypeError("WebSocket frames must use JSON text"));
      socket.close(1002, "JSON text required");
      return;
    }
    let message;
    try {
      message = JSON.parse(eventData(value));
    } catch (error) {
      onError(error);
      socket.close(1002, "invalid JSON frame");
      return;
    }
    if (!authenticated) {
      if (message?.type === "authenticated") {
        authenticated = true;
        onAuthenticated();
        return;
      }
      onError(new Error("mail-server did not acknowledge WebSocket authentication"));
      socket.close(1008, "authentication required");
      return;
    }
    if (message?.type !== "authenticated") onEvent(message);
  });
  subscribe(socket, "close", (event) => onClose(event?.code ?? 1006));
  subscribe(socket, "error", (error) =>
    onError(error instanceof Error ? error : new Error("WebSocket error")),
  );
  return socket;
}
