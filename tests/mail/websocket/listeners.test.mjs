import { expect, jest, test } from "@jest/globals";
import { subscribe } from "../../../src/mail/websocket/listeners.mjs";

test("subscribes to browser and Node socket events", () => {
  const handler = jest.fn();
  const browserSocket = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const removeBrowser = subscribe(browserSocket, "message", handler);
  removeBrowser();
  expect(browserSocket.addEventListener).toHaveBeenCalledWith("message", handler);
  expect(browserSocket.removeEventListener).toHaveBeenCalledWith("message", handler);
  subscribe({ addEventListener: jest.fn() }, "message", handler)();

  const nodeSocket = { on: jest.fn(), off: jest.fn() };
  subscribe(nodeSocket, "close", handler)();
  expect(nodeSocket.on).toHaveBeenCalledWith("close", handler);
  expect(nodeSocket.off).toHaveBeenCalledWith("close", handler);
  subscribe({ on: jest.fn() }, "close", handler)();
});

test("rejects sockets without event listener methods", () => {
  expect(() => subscribe({}, "open", jest.fn())).toThrow("WebSocket must support event listeners");
});
