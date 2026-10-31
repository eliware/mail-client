import { expect, jest, test } from "@jest/globals";
import { createWebSocketSession } from "../../../src/mail/websocket/session.mjs";

class Socket {
  static current;
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.sent = [];
    Socket.current = this;
  }
  on(name, handler) {
    this.listeners.set(name, handler);
  }
  off() {}
  send(value) {
    this.sent.push(value);
  }
  close(code, reason) {
    this.closed = { code, reason };
  }
  emit(name, ...args) {
    this.listeners.get(name)?.(...args);
  }
}

function start(callbacks = {}) {
  const socket = createWebSocketSession({
    url: "wss://mail.test/ws",
    token: "test-value",
    WebSocketImpl: Socket,
    onAuthenticated: jest.fn(),
    onEvent: jest.fn(),
    onClose: jest.fn(),
    onError: jest.fn(),
    ...callbacks,
  });
  return { socket, ...callbacks };
}

test("sends authentication first and emits events only after acknowledgement", () => {
  const onAuthenticated = jest.fn();
  const onEvent = jest.fn();
  const session = start({ onAuthenticated, onEvent });
  session.socket.emit("open");
  expect(JSON.parse(session.socket.sent[0]).type).toBe("authenticate");
  session.socket.emit("message", Buffer.from('{"type":"authenticated"}'));
  expect(onAuthenticated).toHaveBeenCalledTimes(1);
  session.socket.emit("message", Buffer.from('{"type":"authenticated"}'));
  session.socket.emit("message", Buffer.from('{"event_id":"1"}'));
  expect(onEvent).toHaveBeenCalledWith({ event_id: "1" });
  expect(onEvent).toHaveBeenCalledTimes(1);
});

test("closes invalid frames and reports socket errors", () => {
  const onError = jest.fn();
  const session = start({ onError });
  session.socket.emit("message", Buffer.from("{}"), true);
  expect(session.socket.closed.code).toBe(1002);
  const invalidJson = start({ onError });
  invalidJson.socket.emit("message", { data: "{" });
  expect(invalidJson.socket.closed.code).toBe(1002);
  const wrongFrame = start({ onError });
  wrongFrame.socket.emit("message", { data: "{}" });
  expect(wrongFrame.socket.closed.code).toBe(1008);
  if (typeof Blob !== "undefined") {
    const binaryBlob = start({ onError });
    binaryBlob.socket.emit("message", { data: new Blob(["{}"]), type: "binary" });
    expect(binaryBlob.socket.closed).toEqual({ code: 1002, reason: "JSON text required" });
  }
  const live = start({ onError });
  live.socket.emit("error", "socket failure");
  expect(onError.mock.calls.at(-1)[0]).toBeInstanceOf(Error);
  const errorValue = new Error("socket failure");
  live.socket.emit("error", errorValue);
  expect(onError.mock.calls.at(-1)[0]).toBe(errorValue);
  const onClose = jest.fn();
  const closeSession = start({ onClose });
  closeSession.socket.emit("close");
  expect(onClose).toHaveBeenCalledWith(1006);
});
