import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createMailClient } from "../../src/mail/client.mjs";

class FakeSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.sent = [];
    FakeSocket.instances.push(this);
  }

  addEventListener(name, handler) {
    const handlers = this.listeners.get(name) ?? [];
    handlers.push(handler);
    this.listeners.set(name, handlers);
  }

  removeEventListener() {}

  send(value) {
    this.sent.push(value);
  }

  close(code, reason) {
    this.closed = { code, reason };
  }

  emit(name, value) {
    for (const handler of this.listeners.get(name) ?? []) handler(value);
  }
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("builds authenticated HTTP methods", async () => {
  const fetchImpl = jest.fn(
    async () => new Response(JSON.stringify({ data: {}, request_id: "req-1" }), { status: 200 }),
  );
  const client = createMailClient({
    baseUrl: "https://mail.example.test",
    getAccessToken: () => "server-token",
    fetchImpl,
  });

  await client.messages.get("message-1");
  expect(fetchImpl.mock.calls[0][0].pathname).toBe("/api/messages/message-1");
  expect(fetchImpl.mock.calls[0][1].headers.get("authorization")).toBe("Bearer server-token");
});

test("validates the default client and event options", () => {
  expect(() => createMailClient()).toThrow("baseUrl must be a valid URL");
  const client = createMailClient({
    baseUrl: "https://mail.example.test",
    getAccessToken: () => "server-token",
    WebSocketImpl: FakeSocket,
  });
  expect(() => client.connectEvents()).toThrow("onEvent must be a function");
  expect(() => client.connectEvents({ WebSocketImpl: FakeSocket })).toThrow(
    "onEvent must be a function",
  );
});

test("acknowledges durable event cursors after handlers complete", async () => {
  FakeSocket.instances = [];
  const fetchImpl = jest.fn(
    async () =>
      new Response(JSON.stringify({ data: { acknowledged: true }, request_id: "req-2" }), {
        status: 200,
      }),
  );
  const client = createMailClient({
    baseUrl: "https://mail.example.test",
    getAccessToken: () => "browser-token",
    fetchImpl,
    WebSocketImpl: FakeSocket,
  });
  const connection = client.connectEvents({ consumerId: "discord-1", onEvent: async () => {} });
  await Promise.resolve();
  const socket = FakeSocket.instances[0];
  socket.emit("open");
  socket.emit("message", { data: JSON.stringify({ type: "authenticated" }) });
  await connection.ready;
  socket.emit("message", { data: JSON.stringify({ event_id: "102", cursor: "102" }) });
  await jest.advanceTimersByTimeAsync(0);

  expect(fetchImpl.mock.calls[0][0].pathname).toBe("/api/events/ack");
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
    consumer_id: "discord-1",
    cursor: "102",
  });
  expect(connection.cursor).toBe("102");
  connection.close();
});
