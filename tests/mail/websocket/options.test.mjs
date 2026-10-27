import { expect, test } from "@jest/globals";
import { validateEventOptions } from "../../../src/mail/websocket/options.mjs";

const valid = {
  getAccessToken: () => "x",
  WebSocketImpl: class {},
  onEvent: () => {},
  onError: () => {},
  retryDelayMs: 1,
  maxReconnectDelayMs: 2,
};

test("accepts valid optional event settings", () => {
  expect(() => validateEventOptions(valid)).not.toThrow();
  expect(() =>
    validateEventOptions({
      ...valid,
      consumerId: "consumer",
      acknowledgeEvent: () => {},
      after: "10",
    }),
  ).not.toThrow();
});

test("rejects invalid required callbacks and constructors", () => {
  expect(() => validateEventOptions({ ...valid, getAccessToken: null })).toThrow();
  expect(() => validateEventOptions({ ...valid, WebSocketImpl: null })).toThrow();
  expect(() => validateEventOptions({ ...valid, onEvent: null })).toThrow();
  expect(() => validateEventOptions({ ...valid, onError: null })).toThrow();
});

test("rejects invalid consumers, retry values, and cursors", () => {
  expect(() => validateEventOptions({ ...valid, consumerId: "" })).toThrow();
  expect(() => validateEventOptions({ ...valid, consumerId: "consumer" })).toThrow();
  expect(() => validateEventOptions({ ...valid, retryDelayMs: -1 })).toThrow();
  expect(() => validateEventOptions({ ...valid, retryDelayMs: Infinity })).toThrow();
  expect(() => validateEventOptions({ ...valid, maxReconnectDelayMs: 0 })).toThrow();
  expect(() => validateEventOptions({ ...valid, maxReconnectDelayMs: Infinity })).toThrow();
  expect(() => validateEventOptions({ ...valid, after: "bad" })).toThrow();
});
