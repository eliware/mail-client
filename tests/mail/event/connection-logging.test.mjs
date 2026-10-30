import { expect, jest, test } from "@jest/globals";
import { createEventConnectionLogger } from "../../../src/mail/event/connection-logging.mjs";
import { createEventConnection } from "../../../src/mail/event/connection.mjs";
import { FakeSocket } from "../../../test-fixtures/fake-socket.mjs";

test("writes safe structured lifecycle records for events and connections", () => {
  const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const logs = createEventConnectionLogger(logger);

  logs.started("7");
  logs.tokenProviderFailed(new TypeError("secret text"));
  logs.invalidToken();
  logs.reconnectScheduled(1006, 50, 2, "7");
  logs.eventSkipped("7");
  logs.eventStarted("message.created", "8");
  logs.eventCompleted("message.created", "8", true);
  logs.authenticated("8");
  logs.eventFailed({ event_type: "message.created", event_id: "9" }, new Error("private"));
  logs.closed(1006, false, "8");
  logs.closed(1000, true, "8");
  logs.socketFailed(null);
  logs.startFailed(new Error("private"));
  logs.clientClosed("8");

  expect(logger.debug).toHaveBeenCalled();
  expect(logger.warn).toHaveBeenCalledWith(
    "Mail event connection reconnect scheduled",
    expect.objectContaining({ closeCode: 1006, delayMs: 50, attempt: 2, cursor: "7" }),
  );
  expect(logger.error).toHaveBeenCalledWith(
    "Mail event handling failed",
    expect.objectContaining({ eventType: "message.created", cursor: "9", errorName: "Error" }),
  );
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain("secret text");
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain("private");
});

test("does not let logger failures affect event handling", () => {
  const fail = () => {
    throw new Error("logger failure");
  };
  const logs = createEventConnectionLogger({ debug: fail, warn: fail, error: fail });

  expect(() => logs.started(null)).not.toThrow();
  expect(() => logs.tokenProviderFailed(null)).not.toThrow();
  expect(() => logs.closed(1006, false, null)).not.toThrow();
  expect(() => logs.eventFailed({ event_id: "1" }, new Error())).not.toThrow();
});

test("reports socket errors through the logger and caller callback", async () => {
  const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const onError = jest.fn();
  const connection = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => "test-value",
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    onError,
    logger,
  });
  await Promise.resolve();
  const [socket] = FakeSocket.instances;
  socket.emit("error", new Error("socket failed"));

  expect(logger.error).toHaveBeenCalledWith(
    "Mail event socket failed",
    expect.objectContaining({ errorName: "Error" }),
  );
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "socket failed" }));
  connection.close();
});
