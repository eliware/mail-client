import { expect, jest, test } from "@jest/globals";
import { MailApiError } from "../../../src/mail/api/error.mjs";
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
  await api.messages.saveDiscordLink("message/1", {
    discordChannelId: "123456789012345678",
    discordMessageId: "323456789012345678",
  });
  await api.search("mail query");
  await api.sent.list({ from: "eli@example.test" });
  await api.sent.get("s1");
  await api.sent.status("s1");
  await api.sent.retry("s1");
  await api.sent.cancel("s1");
  await api.sent.delete("s1");
  await api.sent.retryUncertain("s1", { deliveryId: "d1", confirmDuplicateRisk: true });
  await api.sent.saveDiscordLink("outbound/1", {
    discordChannelId: "123456789012345678",
    discordMessageId: "223456789012345678",
  });
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
  await api.discordLinks.find("123456789012345678", "423456789012345678");

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
    "/api/messages/message%2F1/discord-links",
    "/api/search?q=mail+query",
    "/api/sent?from=eli%40example.test",
    "/api/sent/s1",
    "/api/sent/s1/status",
    "/api/sent/s1/retry",
    "/api/sent/s1/cancel",
    "/api/sent/s1",
    "/api/sent/s1/retry-uncertain",
    "/api/sent/outbound%2F1/discord-links",
    "/api/domains",
    "/api/domains",
    "/api/domains/example.test",
    "/api/send",
    "/api/send-multipart",
    "/api/events?after=100&limit=10",
    "/api/events?consumer_id=consumer-1&limit=10",
    "/api/events",
    "/api/events/ack",
    "/api/discord-links?discord_channel_id=123456789012345678&discord_message_id=423456789012345678",
  ]);
  expect(request).toHaveBeenCalledWith("/api/attachments/att-1");
  expect(requestJson.mock.calls[0][1]).toEqual({ method: "POST" });
  expect(requestJson.mock.calls[8][1]).toMatchObject({ method: "PATCH", body: { isRead: true } });
  expect(requestJson.mock.calls[18][1].body).toEqual({
    delivery_id: "d1",
    confirm_duplicate_risk: true,
  });
  expect(requestJson.mock.calls[10][1]).toEqual({
    method: "PUT",
    body: {
      discord_channel_id: "123456789012345678",
      discord_message_id: "323456789012345678",
    },
  });
  expect(requestJson.mock.calls[19][1]).toEqual({
    method: "PUT",
    body: {
      discord_channel_id: "123456789012345678",
      discord_message_id: "223456789012345678",
    },
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
  expect(() => api.messages.saveDiscordLink("m1", {})).toThrow(
    "discordChannelId must be a valid Discord Snowflake ID",
  );
  expect(() => api.messages.saveDiscordLink("m1")).toThrow(
    "discordChannelId must be a valid Discord Snowflake ID",
  );
  expect(() => api.sent.saveDiscordLink("s1")).toThrow(
    "discordChannelId must be a valid Discord Snowflake ID",
  );
  expect(() =>
    api.sent.saveDiscordLink("s1", {
      discordChannelId: "18446744073709551616",
      discordMessageId: "123456789012345678",
    }),
  ).toThrow("discordChannelId must be a valid Discord Snowflake ID");
  expect(() => api.discordLinks.find("123456789012345678", "0")).toThrow(
    "discordMessageId must be a valid Discord Snowflake ID",
  );
  expect(requestJson).not.toHaveBeenCalled();
});

test("returns Discord link envelopes and preserves API errors", async () => {
  const response = {
    data: { mail_kind: "sent", mail_id: "outbound-1" },
    request_id: "request-1",
  };
  const savedResponse = {
    data: {
      message_id: "message-1",
      discord_links: [
        { discord_channel_id: "123456789012345678", discord_message_id: "423456789012345678" },
      ],
    },
    request_id: "request-2",
  };
  const requestJson = jest
    .fn()
    .mockResolvedValueOnce(response)
    .mockResolvedValueOnce(savedResponse);
  const api = createApiMethods({ request: jest.fn(), requestJson });
  await expect(api.discordLinks.find("123456789012345678", "423456789012345678")).resolves.toBe(
    response,
  );
  await expect(
    api.messages.saveDiscordLink("message-1", {
      discordChannelId: "123456789012345678",
      discordMessageId: "423456789012345678",
    }),
  ).resolves.toBe(savedResponse);

  const apiError = new MailApiError(
    404,
    { error: { code: "DISCORD_LINK_NOT_FOUND", message: "Discord link not found" } },
    new Headers({ "x-request-id": "request-404" }),
  );
  requestJson.mockRejectedValue(apiError);
  await expect(
    api.messages.saveDiscordLink("message-1", {
      discordChannelId: "123456789012345678",
      discordMessageId: "423456789012345678",
    }),
  ).rejects.toBe(apiError);
  await expect(
    api.sent.saveDiscordLink("outbound-1", {
      discordChannelId: "123456789012345678",
      discordMessageId: "423456789012345678",
    }),
  ).rejects.toBe(apiError);
  await expect(api.discordLinks.find("123456789012345678", "423456789012345678")).rejects.toBe(
    apiError,
  );
});
