import { expect, jest, test } from "@jest/globals";
import { createApiMethods } from "../../../src/mail/api/methods.mjs";

test("maps public methods to current mail-server API routes", async () => {
  const request = jest.fn(async (path, options) => ({ path, options }));
  const requestJson = jest.fn(async (path, options) => ({ path, options }));
  const api = createApiMethods({ request, requestJson });

  await api.auth.requestBrowserToken();
  await api.status();
  await api.inbox.list({ limit: 20, tag: ["a", "b"], before: null });
  await api.messages.list();
  await api.messages.unreadCount();
  await api.messages.get("a/b");
  await api.messages.headers("m1");
  await api.messages.thread("m1");
  await api.messages.update("m1", { isRead: true });
  await api.messages.delete("m1");
  await api.search("mail query");
  await api.sent.list({ from: "eli@example.test" });
  await api.sent.get("s1");
  await api.sent.status("s1");
  await api.sent.retry("s1");
  await api.sent.cancel("s1");
  await api.sent.delete("s1");
  await api.sent.retryUncertain("s1", { deliveryId: "d1", confirmDuplicateRisk: true });
  await api.domains.list();
  await api.domains.create("example.test");
  await api.domains.delete("example.test");
  await api.send({ to: ["eli@example.test"] });
  await api.sendMultipart(new FormData());
  await api.attachments.download("att-1");
  await api.events.read({ after: "100", limit: 10 });
  await api.events.read({ consumerId: "consumer-1", limit: 10 });
  await api.events.read();
  await api.events.acknowledge("consumer-1", "101");

  expect(requestJson.mock.calls.map(([path]) => path)).toEqual([
    "/api/auth/token",
    "/api/status",
    "/api/inbox?limit=20&tag=a&tag=b",
    "/api/messages",
    "/api/messages/unread-count",
    "/api/messages/a%2Fb",
    "/api/messages/m1/headers",
    "/api/messages/m1/thread",
    "/api/messages/m1",
    "/api/messages/m1",
    "/api/search?q=mail+query",
    "/api/sent?from=eli%40example.test",
    "/api/sent/s1",
    "/api/sent/s1/status",
    "/api/sent/s1/retry",
    "/api/sent/s1/cancel",
    "/api/sent/s1",
    "/api/sent/s1/retry-uncertain",
    "/api/domains",
    "/api/domains",
    "/api/domains/example.test",
    "/api/send",
    "/api/send-multipart",
    "/api/events?after=100&limit=10",
    "/api/events?consumer_id=consumer-1&limit=10",
    "/api/events",
    "/api/events/ack",
  ]);
  expect(request).toHaveBeenCalledWith("/api/attachments/att-1");
  expect(requestJson.mock.calls[0][1]).toEqual({ method: "POST" });
  expect(requestJson.mock.calls[8][1]).toMatchObject({ method: "PATCH", body: { isRead: true } });
  expect(requestJson.mock.calls[17][1].body).toEqual({
    delivery_id: "d1",
    confirm_duplicate_risk: true,
  });
});

test("requires valid identifiers and uncertain retry confirmation", () => {
  const requestJson = jest.fn();
  const api = createApiMethods({ request: jest.fn(), requestJson });

  expect(() => api.messages.get("")).toThrow("id must be a non-empty string or number");
  expect(() => api.messages.get(null)).toThrow("id must be a non-empty string or number");
  expect(() => api.sent.retryUncertain("s1", { deliveryId: "d1" })).toThrow(
    "confirmDuplicateRisk must be true for uncertain delivery retries",
  );
  expect(() => api.sent.retryUncertain("s1")).toThrow(
    "confirmDuplicateRisk must be true for uncertain delivery retries",
  );
  expect(() => api.sent.retryUncertain("s1", { confirmDuplicateRisk: true })).toThrow(
    "deliveryId must be a non-empty string",
  );
  expect(() => api.events.acknowledge("", "1")).toThrow("consumerId must be a non-empty string");
  expect(() => api.events.acknowledge("consumer", "")).toThrow("cursor must be a non-empty string");
  expect(() => api.events.read({ after: "100", consumerId: "consumer-1" })).toThrow(
    "after and consumerId cannot be used together",
  );
  expect(requestJson).not.toHaveBeenCalled();
});
