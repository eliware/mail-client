import { expect, test } from "@jest/globals";
import { socketUrl } from "../../../src/mail/websocket/address.mjs";

test("builds a socket address with an optional cursor and no token", () => {
  expect(socketUrl("https://mail.test", null)).toBe("wss://mail.test/ws");
  expect(socketUrl("http://mail.test", "123")).toBe("ws://mail.test/ws?after=123");
  expect(socketUrl("https://mail.test", null, "discord-prod")).toBe(
    "wss://mail.test/ws?consumer_id=discord-prod",
  );
  expect(socketUrl("https://mail.test", "123", "discord-prod")).toBe(
    "wss://mail.test/ws?after=123&consumer_id=discord-prod",
  );
});
