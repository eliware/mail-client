import { expect, test } from "@jest/globals";
import { isValidCursor } from "../../../src/mail/websocket/cursor.mjs";

test("accepts decimal Snowflake cursors in range", () => {
  expect(isValidCursor("0")).toBe(true);
  expect(isValidCursor("18446744073709551615")).toBe(true);
});

test("rejects malformed or out-of-range cursors", () => {
  expect(isValidCursor(1)).toBe(false);
  expect(isValidCursor("01")).toBe(false);
  expect(isValidCursor("not-a-cursor")).toBe(false);
  expect(isValidCursor("18446744073709551616")).toBe(false);
});
