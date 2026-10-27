import { expect, test } from "@jest/globals";
import { eventData } from "../../../src/mail/websocket/frames.mjs";

test("decodes text and binary frame data", () => {
  expect(eventData({ data: "hello" })).toBe("hello");
  expect(eventData(Buffer.from("hello"))).toBe("hello");
  expect(eventData(new TextEncoder().encode("hello").buffer)).toBe("hello");
});

test("rejects frames without text or byte data", () => {
  expect(() => eventData({})).toThrow("WebSocket frame must contain JSON text");
});
