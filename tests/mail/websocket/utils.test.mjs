import { expect, jest, test } from "@jest/globals";
import {
  eventData,
  socketUrl,
  subscribe,
  validateEventOptions,
} from "../../../src/mail/websocket/utils.mjs";

test("supports browser and Node socket listeners", () => {
  const handler = jest.fn();
  const browserSocket = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const removeBrowser = subscribe(browserSocket, "message", handler);
  removeBrowser();
  expect(browserSocket.addEventListener).toHaveBeenCalledWith("message", handler);
  expect(browserSocket.removeEventListener).toHaveBeenCalledWith("message", handler);
  const nodeSocket = { on: jest.fn(), off: jest.fn() };
  subscribe(nodeSocket, "close", handler)();
  expect(nodeSocket.on).toHaveBeenCalledWith("close", handler);
  expect(nodeSocket.off).toHaveBeenCalledWith("close", handler);
  expect(() => subscribe({}, "open", handler)).toThrow("WebSocket must support event listeners");
});

test("reads text frames and builds token-free socket addresses", () => {
  expect(eventData({ data: "hello" })).toBe("hello");
  expect(eventData(Buffer.from("hello"))).toBe("hello");
  expect(eventData(new TextEncoder().encode("hello").buffer)).toBe("hello");
  expect(() => eventData({})).toThrow("WebSocket frame must contain JSON text");
  expect(socketUrl("https://mail.test", null)).toBe("wss://mail.test/ws");
  expect(socketUrl("http://mail.test", "123")).toBe("ws://mail.test/ws?after=123");
});

test("rejects invalid event connection options", () => {
  const base = {
    getAccessToken: () => "x",
    WebSocketImpl: class {},
    onEvent: () => {},
    onError: () => {},
    retryDelayMs: 1,
    maxReconnectDelayMs: 2,
  };
  expect(() => validateEventOptions({ ...base, getAccessToken: null })).toThrow();
  expect(() => validateEventOptions({ ...base, WebSocketImpl: null })).toThrow();
  expect(() => validateEventOptions({ ...base, onEvent: null })).toThrow();
  expect(() => validateEventOptions({ ...base, onError: null })).toThrow();
  expect(() => validateEventOptions({ ...base, consumerId: "" })).toThrow();
  expect(() => validateEventOptions({ ...base, consumerId: "c" })).toThrow();
  expect(() => validateEventOptions({ ...base, retryDelayMs: -1 })).toThrow();
  expect(() => validateEventOptions({ ...base, maxReconnectDelayMs: 0 })).toThrow();
  expect(() => validateEventOptions({ ...base, after: "bad" })).toThrow();
});
