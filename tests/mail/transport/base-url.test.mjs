import { expect, test } from "@jest/globals";
import { normalizeBaseUrl } from "../../../src/mail/transport/base-url.mjs";

test("normalizes HTTP and HTTPS base addresses", () => {
  expect(normalizeBaseUrl("http://mail.test/")).toBe("http://mail.test");
  expect(normalizeBaseUrl("https://mail.test")).toBe("https://mail.test");
});

test("rejects malformed URLs and unsupported protocols", () => {
  expect(() => normalizeBaseUrl("not a URL")).toThrow("baseUrl must be a valid URL");
  expect(() => normalizeBaseUrl("ftp://mail.test")).toThrow("baseUrl must use HTTP or HTTPS");
});

test("rejects credentials and extra URL components", () => {
  for (const value of [
    "https://user@mail.test",
    "https://:pass@mail.test",
    "https://mail.test/path",
    "https://mail.test/?q=mail",
    "https://mail.test/#mail",
  ]) {
    expect(() => normalizeBaseUrl(value)).toThrow(
      "baseUrl must be an HTTP origin without credentials or extra components",
    );
  }
});
