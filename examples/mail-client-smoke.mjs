import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createMailClient } from "../src/index.browser.mjs";

class SmokeSocket {
  static current;
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.sent = [];
    SmokeSocket.current = this;
    queueMicrotask(() => this.emit("open"));
  }
  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }
  send(frame) {
    this.sent.push(frame);
    queueMicrotask(() => {
      this.emit("message", { data: JSON.stringify({ type: "authenticated" }) });
      this.emit("message", {
        data: JSON.stringify({ event_id: "123", cursor: "123", event_type: "message.created" }),
      });
    });
  }
  close() {}
  emit(name, value) {
    this.listeners.get(name)?.(value);
  }
}

const server = createServer(async (request, response) => {
  assert.equal(request.headers.authorization, "Bearer temporary-token");
  if (request.url === "/api/auth/token") {
    response.end(
      JSON.stringify({ data: { access_token: "temporary-token" }, request_id: "smoke-1" }),
    );
    return;
  }
  response.end(JSON.stringify({ data: { ok: true }, request_id: "smoke-2" }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const { port } = server.address();
  const client = createMailClient({
    baseUrl: `http://127.0.0.1:${port}`,
    getAccessToken: () => "temporary-token",
    WebSocketImpl: SmokeSocket,
  });
  const token = await client.auth.requestBrowserToken();
  assert.equal(token.data.access_token, "temporary-token");
  const status = await client.status();
  assert.equal(status.data.ok, true);
  const seen = [];
  const events = client.connectEvents({ onEvent: (event) => seen.push(event.event_id) });
  await events.ready;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(seen, ["123"]);
  const authFrame = JSON.parse(SmokeSocket.current.sent[0]);
  assert.equal(authFrame.type, "authenticate");
  assert.equal(typeof authFrame.token, "string");
  events.close();
  process.stdout.write("mail-client smoke check passed\n");
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
