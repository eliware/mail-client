import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createEventConnection } from "../../../src/mail/event/connection.mjs";
import { FakeSocket } from "../../../test-fixtures/fake-socket.mjs";

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
  ).toThrow("after must be a decimal Snowflake cursor");
  const { connection, socket } = await connect();
  const ready = expect(connection.ready).rejects.toThrow("authentication closed with code 1008");
  socket.emit("close", { code: 1008 });
  await ready;
  connection.close();
});

test("reconnects with the last acknowledged cursor and stops when closed", async () => {
  const onEvent = jest.fn();
  const { connection, socket } = await connect({
    autoReconnect: true,
    retryDelayMs: 10,
    maxReconnectDelayMs: 20,
    onEvent,
  });
  socket.emit("open");
  const authFrame = JSON.parse(socket.sent[0]);
  expect(authFrame.type).toBe("authenticate");
  expect(typeof authFrame.token).toBe("string");
  socket.emit("message", { data: '{"type":"authenticated"}' });
  await connection.ready;
  const event = { event_id: "1", cursor: "1", event_type: "message.created" };
  socket.emit("message", { data: JSON.stringify(event) });
  await jest.advanceTimersByTimeAsync(0);
  expect(onEvent).toHaveBeenCalledWith(event);
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
  const socketCountBeforeFailure = FakeSocket.instances.length;
  const failure = await connect({
    onEvent: failingHandler,
    onError: jest.fn(),
    autoReconnect: true,
    retryDelayMs: 10,
  });
  failure.socket.emit("open");
  failure.socket.emit("message", { data: '{"type":"authenticated"}' });
  await failure.connection.ready;
  failure.socket.emit("message", { data: '{"event_id":"9"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(failure.socket.closed.code).toBe(1011);
  expect(jest.getTimerCount()).toBe(0);
  expect(FakeSocket.instances).toHaveLength(socketCountBeforeFailure + 1);
  failure.connection.close();

  const badCursor = await connect({ after: "1", onEvent: jest.fn(), onError: jest.fn() });
  badCursor.socket.emit("open");
  badCursor.socket.emit("message", { data: '{"type":"authenticated"}' });
  await badCursor.connection.ready;
  badCursor.socket.emit("message", { data: '{"event_id":"not-a-number"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(badCursor.socket.closed.code).toBe(1011);
  badCursor.connection.close();

  const onMalformedEvent = jest.fn();
  const malformedEvent = await connect({
    onEvent: onMalformedEvent,
    onError: jest.fn(),
  });
  malformedEvent.socket.emit("open");
  malformedEvent.socket.emit("message", { data: '{"type":"authenticated"}' });
  await malformedEvent.connection.ready;
  malformedEvent.socket.emit("message", { data: '{"event_id":"not-a-number"}' });
  await jest.advanceTimersByTimeAsync(0);
  expect(onMalformedEvent).not.toHaveBeenCalled();
  expect(malformedEvent.connection.cursor).toBeNull();
  expect(malformedEvent.socket.closed.code).toBe(1011);
  malformedEvent.connection.close();

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
  let tokenAttempts = 0;
  const getAccessToken = jest.fn(() => {
    tokenAttempts += 1;
    if (tokenAttempts === 1) return Promise.reject(new Error("token unavailable"));
    return "test-value";
  });
  const connection = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken,
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    onError,
    retryDelayMs: 10,
  });
  await expect(connection.ready).rejects.toThrow("token unavailable");
  expect(onError).toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(10);
  expect(getAccessToken).toHaveBeenCalledTimes(2);
  expect(FakeSocket.instances).toHaveLength(1);
  expect(jest.getTimerCount()).toBe(0);
  connection.close();

  let constructionAttempts = 0;
  class WebSocketImpl {
    constructor() {
      constructionAttempts += 1;
      throw new Error("socket construction failed");
    }
  }
  const constructionFailure = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => "x",
    WebSocketImpl,
    onEvent: jest.fn(),
    onError,
    retryDelayMs: 10,
  });
  await expect(constructionFailure.ready).rejects.toThrow("socket construction failed");
  await jest.advanceTimersByTimeAsync(100);
  expect(constructionAttempts).toBe(1);
  expect(jest.getTimerCount()).toBe(0);
  constructionFailure.close();

  const invalidTokenProvider = jest.fn(() => 42);
  const invalid = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: invalidTokenProvider,
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    retryDelayMs: 10,
  });
  await expect(invalid.ready).rejects.toThrow(
    "getAccessToken must return a non-empty bearer token",
  );
  await jest.advanceTimersByTimeAsync(100);
  expect(invalidTokenProvider).toHaveBeenCalledTimes(1);
  invalid.close();
});

test("allows close before readiness when callers ignore the ready promise", () => {
  const connection = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => new Promise(() => {}),
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
  });
  connection.close();
});

test("does not open or reconnect when closed during token retrieval", async () => {
  let resolveToken;
  const token = new Promise((resolve) => {
    resolveToken = resolve;
  });
  const onError = jest.fn();
  const resolving = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => token,
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    onError,
  });
  const resolveReady = expect(resolving.ready).rejects.toThrow("closed by the client");
  resolving.close();
  resolveToken("test-value");
  await resolveReady;

  let rejectToken;
  const rejectedToken = new Promise((_, reject) => {
    rejectToken = reject;
  });
  const rejected = createEventConnection({
    baseUrl: "https://mail.test",
    getAccessToken: () => rejectedToken,
    WebSocketImpl: FakeSocket,
    onEvent: jest.fn(),
    onError,
  });
  const rejectReady = expect(rejected.ready).rejects.toThrow("closed by the client");
  rejected.close();
  rejectToken(new Error("token provider failed"));
  await rejectReady;
  await Promise.resolve();
  await jest.advanceTimersByTimeAsync(100);

  expect(FakeSocket.instances).toHaveLength(0);
  expect(onError).not.toHaveBeenCalled();
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
