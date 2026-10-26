import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createEventConnection } from "../../src/mail/event-connection.mjs";

class FakeSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    FakeSocket.instances.push(this);
  }
  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }
  send() {}
  close(code, reason) {
    this.closed = { code, reason };
  }
  emit(name, value) {
    this.listeners.get(name)?.(value);
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
});
afterEach(() => jest.useRealTimers());

async function connect(overrides = {}) {
  const connection = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => "test-value",
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    autoReconnect: false,
    ...overrides,
  });
  await Promise.resolve();
  return { connection, socket: FakeSocket.instances.at(-1) };
}

test("rejects malformed cursors and reports authentication failures", async () => {
  expect(() => createEventConnection()).toThrow("getAccessToken must be a function");
  expect(() =>
    createEventConnection({
      baseUrl: "https://mail.test",
      getAccessToken: () => "x",
      WebSocketImpl: FakeSocket,
      onEvent: jest.fn(),
      after: "bad",
    }),
  ).toThrow("after must be a decimal cursor string");
  const { connection, socket } = await connect();
  const ready = expect(connection.ready).rejects.toThrow("authentication closed with code 1008");
  socket.emit("close", { code: 1008 });
  await ready;
  connection.close();
});

test("reconnects with the last acknowledged cursor and stops when closed", async () => {
  const { connection, socket } = await connect({
    autoReconnect: true,
    retryDelayMs: 10,
    maxReconnectDelayMs: 20,
  });
  socket.emit("open");
  socket.emit("message", { data: '{"type":"authenticated"}' });
  await connection.ready;
  socket.emit("message", { data: '{"event_id":"1","cursor":"1"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(connection.cursor).toBe("1");
  socket.emit("close", { code: 1006 });
  await jest.advanceTimersByTimeAsync(10);
  await Promise.resolve();
  expect(FakeSocket.instances[1].url).toBe("wss://mail.test/ws?after=1");
  connection.close();
  await jest.advanceTimersByTimeAsync(100);
  expect(FakeSocket.instances).toHaveLength(2);
});

test("cancels a pending reconnect timer when closed", async () => {
  const { connection, socket } = await connect({ autoReconnect: true, retryDelayMs: 10 });
  const failedReady = expect(connection.ready).rejects.toThrow(
    "authentication closed with code 1006",
  );
  socket.emit("close", { code: 1006 });
  await failedReady;
  connection.close();
  await jest.advanceTimersByTimeAsync(20);
  expect(FakeSocket.instances).toHaveLength(1);
});

test("skips old events and closes after handler or acknowledgement errors", async () => {
  const onEvent = jest.fn();
  const { connection, socket } = await connect({ after: "4", onEvent });
  socket.emit("open");
  socket.emit("message", { data: '{"type":"authenticated"}' });
  await connection.ready;
  socket.emit("message", { data: '{"event_id":"4","cursor":"4"}' });
  socket.emit("message", { data: '{"event_id":"5","cursor":"5"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(onEvent).toHaveBeenCalledTimes(1);
  expect(connection.cursor).toBe("5");
  connection.close();

  const untracked = await connect({ onEvent: jest.fn() });
  untracked.socket.emit("open");
  untracked.socket.emit("message", { data: '{"type":"authenticated"}' });
  await untracked.connection.ready;
  untracked.socket.emit("message", { data: '{"event_type":"message.updated"}' });
  await jest.advanceTimersByTimeAsync(0);
  untracked.connection.close();

  const failingHandler = jest.fn(async () => {
    throw new Error("handler failed");
  });
  const failure = await connect({ onEvent: failingHandler, onError: jest.fn() });
  failure.socket.emit("open");
  failure.socket.emit("message", { data: '{"type":"authenticated"}' });
  await failure.connection.ready;
  failure.socket.emit("message", { data: '{"event_id":"9"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(failure.socket.closed.code).toBe(1011);
  failure.connection.close();

  const badCursor = await connect({ after: "1", onEvent: jest.fn(), onError: jest.fn() });
  badCursor.socket.emit("open");
  badCursor.socket.emit("message", { data: '{"type":"authenticated"}' });
  await badCursor.connection.ready;
  badCursor.socket.emit("message", { data: '{"event_id":"not-a-number"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(badCursor.socket.closed.code).toBe(1011);
  badCursor.connection.close();

  const ackFailure = await connect({
    consumerId: "consumer",
    acknowledgeEvent: async () => {
      throw new Error("ack failed");
    },
    onError: () => {
      throw new Error("logger failed");
    },
  });
  ackFailure.socket.emit("open");
  ackFailure.socket.emit("message", { data: '{"type":"authenticated"}' });
  await ackFailure.connection.ready;
  ackFailure.socket.emit("message", { data: '{"event_id":"10"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(ackFailure.socket.closed.code).toBe(1011);
  ackFailure.connection.close();
});

test("reports token provider failures", async () => {
  const onError = jest.fn();
  const connection = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: async () => {
      throw new Error("token unavailable");
    },
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    onError,
    autoReconnect: false,
  });
  await expect(connection.ready).rejects.toThrow("token unavailable");
  expect(onError).toHaveBeenCalled();
  connection.close();

  const invalid = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => 42,
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    autoReconnect: false,
  });
  await expect(invalid.ready).rejects.toThrow(
    "getAccessToken must return a non-empty bearer token",
  );
  invalid.close();
});

test("ignores a reconnect callback after the connection closes", async () => {
  let reconnect;
  const timerSpy = jest.spyOn(globalThis, "setTimeout").mockImplementation((callback) => {
    reconnect = callback;
    return { unref() {} };
  });
  const { connection, socket } = await connect({ autoReconnect: true });
  const failedReady = expect(connection.ready).rejects.toThrow(
    "authentication closed with code 1006",
  );
  socket.emit("close", { code: 1006 });
  await failedReady;
  connection.close();
  await reconnect();
  expect(FakeSocket.instances).toHaveLength(1);
  timerSpy.mockRestore();
});
