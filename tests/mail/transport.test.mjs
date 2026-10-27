import { expect, jest, test } from "@jest/globals";
import { createTransport } from "../../src/mail/transport.mjs";

const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
const goodResponse = () => new Response(JSON.stringify({ data: {}, request_id: "r1" }));

test("validates configuration and request paths", () => {
  const baseUrl = "https://mail.test";
  expect(() => createTransport()).toThrow("baseUrl must be a valid URL");
  expect(() => createTransport({ baseUrl: "https://mail.test", getAccessToken: "x" })).toThrow(
    "getAccessToken must be a function",
  );
  expect(() =>
    createTransport({ baseUrl: "https://mail.test", getAccessToken: () => "x", fetchImpl: "x" }),
  ).toThrow();
  expect(() =>
    createTransport({ baseUrl: "https://mail.test", getAccessToken: () => "x", timeoutMs: 0 }),
  ).toThrow();
  expect(() =>
    createTransport({ baseUrl: "https://mail.test", getAccessToken: () => "x", logger: {} }),
  ).toThrow();
  const transport = createTransport({ baseUrl, getAccessToken: () => "x" });
  expect(() => transport.request("")).rejects.toThrow("path must be a non-empty string");
  expect(() => transport.request("https://other.test/api")).rejects.toThrow(
    "path must use the configured API origin",
  );
});

test("sends bearer JSON requests with timeout and caller cancellation", async () => {
  const fetchImpl = jest.fn(async () => goodResponse());
  const transport = createTransport({
    baseUrl: "https://mail.test",
    getAccessToken: () => "test-value",
    fetchImpl,
    logger,
  });
  await expect(
    transport.requestJson("/api/status", { method: "post", body: { ok: true } }),
  ).resolves.toEqual({
    data: {},
    request_id: "r1",
  });
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url.href).toBe("https://mail.test/api/status");
  expect(options.method).toBe("POST");
  expect(options.headers.get("content-type")).toBe("application/json");
  expect(options.headers.get("authorization")).toContain("Bearer ");
  expect(options.body).toBe('{"ok":true}');
  expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(logger.debug).toHaveBeenCalled();
});

test("serializes plain objects and preserves native Fetch body types", async () => {
  const fetchImpl = jest.fn(async () => goodResponse());
  const transport = createTransport({
    baseUrl: "https://mail.test",
    getAccessToken: () => "x",
    fetchImpl,
  });
  const form = new FormData();
  form.set("to", "eli@example.test");
  await transport.request("/upload", { method: "POST", body: form });
  await transport.request("/text", {
    method: "POST",
    body: "body",
    signal: new AbortController().signal,
  });
  const blob = new Blob(["attachment"], { type: "text/plain" });
  const params = new URLSearchParams({ to: "eli@example.test" });
  const bytes = new Uint8Array([1, 2, 3]);
  await transport.request("/blob", { method: "POST", body: blob });
  await transport.request("/params", { method: "POST", body: params });
  await transport.request("/bytes", { method: "POST", body: bytes });
  await transport.request("/json", { method: "POST", body: { ok: true } });
  expect(fetchImpl.mock.calls[0][1].body).toBe(form);
  expect(fetchImpl.mock.calls[0][1].headers.has("content-type")).toBe(false);
  expect(fetchImpl.mock.calls[1][1].body).toBe("body");
  expect(fetchImpl.mock.calls[1][1].headers.has("content-type")).toBe(false);
  expect(fetchImpl.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  expect(fetchImpl.mock.calls[2][1].body).toBe(blob);
  expect(fetchImpl.mock.calls[2][1].headers.has("content-type")).toBe(false);
  expect(fetchImpl.mock.calls[3][1].body).toBe(params);
  expect(fetchImpl.mock.calls[3][1].headers.has("content-type")).toBe(false);
  expect(fetchImpl.mock.calls[4][1].body).toBe(bytes);
  expect(fetchImpl.mock.calls[4][1].headers.has("content-type")).toBe(false);
  expect(fetchImpl.mock.calls[5][1].body).toBe('{"ok":true}');
  expect(fetchImpl.mock.calls[5][1].headers.get("content-type")).toBe("application/json");
});

test("reports API, network, and token failures without secrets", async () => {
  const fetchImpl = jest.fn(
    async () => new Response("not-json", { status: 502, headers: { "x-request-id": "r2" } }),
  );
  const transport = createTransport({
    baseUrl: "https://mail.test",
    getAccessToken: () => "x",
    fetchImpl,
    logger,
  });
  await expect(transport.request("/error")).rejects.toMatchObject({ status: 502, requestId: "r2" });
  expect(logger.warn).toHaveBeenCalled();
  fetchImpl.mockRejectedValueOnce(new Error("offline"));
  await expect(transport.request("/error")).rejects.toThrow("offline");
  fetchImpl.mockImplementationOnce(async () => {
    throw null;
  });
  await expect(transport.request("/error")).rejects.toBeNull();
  expect(logger.error).toHaveBeenCalled();
  const noToken = createTransport({ baseUrl: "https://mail.test", getAccessToken: () => "" });
  await expect(noToken.request("/api/status")).rejects.toThrow(
    "getAccessToken must return a non-empty bearer token",
  );
});

test("returns a safe fallback when an error response cannot be read", async () => {
  const fetchImpl = jest.fn(async () => ({
    ok: false,
    status: 500,
    headers: new Headers(),
    clone: () => {
      throw new Error("body unavailable");
    },
  }));
  const transport = createTransport({
    baseUrl: "https://mail.test",
    getAccessToken: () => "x",
    fetchImpl,
  });
  await expect(transport.request("/error")).rejects.toMatchObject({ payload: null });
});
