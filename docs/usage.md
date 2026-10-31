# Usage guide

Use `@eliware/mail-client` to call the mail-server HTTP API and receive mail events through WebSocket. The library works in Node.js 26 or later and current browsers.

## Install the package

After the npm release, install the package in the application that calls mail-server:

```sh
npm install @eliware/mail-client
```

Node.js requires Fetch, Headers, AbortSignal, URL, and WebSocket APIs. Node.js 26 provides these APIs. Browser applications require these same APIs.

## Credentials

Use a long-lived API token in trusted Node.js applications. Keep a different token for each application or CLI installation. Store server tokens in Kubernetes secrets or a separate secret store.

Use a short-lived browser token in browser code. The mail-web server keeps its long-lived token and requests a browser token from `POST /api/auth/token`. The mail-web server sends the short-lived token to the signed-in browser through its authenticated session.

The library does not read `MAIL_API_URL`, `MAIL_API_TOKEN`, or `MAIL_WEB_API_TOKEN`. The host application reads those values and passes them through `baseUrl` and `getAccessToken`. Read [package details](package.md) for each value's purpose and default.

EliD sign-in belongs to mail-web. This package does not run OAuth flows and does not depend on `@eliware/elid-client`.

## Create a Node.js client

Pass the mail-server base address and a token provider. The client calls the provider for every HTTP request and each new WebSocket connection.

```js
import { createMailClient } from "@eliware/mail-client";

const mail = createMailClient({
  baseUrl: process.env.MAIL_API_URL,
  getAccessToken: () => process.env.MAIL_API_TOKEN,
  timeoutMs: 30_000,
});

const inbox = await mail.inbox.list({ limit: 20 });
console.log(inbox.data.messages);
```

Give each mail-cli installation its own token. Use a separate token for mail-discord. Keep both tokens on the server.

## Give mail-web a browser token

Create a server-side client with the `MAIL_WEB_API_TOKEN` value. Call the token method after the user signs in to mail-web. Return only the short-lived token and its expiry to browser code.

```js
const mailServer = createMailClient({
  baseUrl: process.env.MAIL_API_URL,
  getAccessToken: () => process.env.MAIL_WEB_API_TOKEN,
});

const tokenResponse = await mailServer.auth.requestBrowserToken();
const token = tokenResponse.data.access_token;
const expiresIn = tokenResponse.data.expires_in;
```

Keep the browser token in memory. Do not put the long-lived server token in browser code. Do not store the browser token in browser storage.

Create a browser client with a token provider that returns the current short-lived token:

```js
const browserMail = createMailClient({
  baseUrl: "https://mail.example.test",
  getAccessToken: () => session.getMailAccessToken(),
});

const inbox = await browserMail.inbox.list({ limit: 20 });
```

The browser calls mail-server directly. Configure mail-server to allow the mail-web site address in `MAIL_ALLOWED_ORIGINS`. The browser sends its site address with cross-origin HTTP and WebSocket requests.

Refresh a browser token before it expires. The client asks the token provider for a token before each HTTP call and each WebSocket reconnect. The host application handles sign-in, token refresh, and session storage.

## Read and change mail

Use named methods for common routes. JSON methods return the complete server envelope.

```js
const message = await mail.messages.get("123456789");
await mail.messages.update("123456789", { read: true });
const results = await mail.search("invoice");
const sent = await mail.send({
  to: "eli@example.test",
  subject: "Hello",
  body: "Hi",
  idempotencyKey: "message-request-123",
});
```

Read `message.data` for message data. Keep `request_id` to match a client failure to a server log.

Use `sendMultipart(formData)` to send attachments as multipart data. Build a native `FormData` object and append the same fields that mail-server accepts. Let Fetch set the multipart content type and boundary.

Use `attachments.download(id)` to receive an attachment as a native `Response`. Read the body as a stream or bytes. Use response headers for the file name, media type, length, checksum, and request ID when the server provides them.

Use `request(path, options)` for a different route or a response that is not JSON. Use `requestJson(path, options)` for an unmodified JSON response. The client does not retry requests. Add an idempotency key to send data when the application requires safe retries.

## Receive mail events

Call `connectEvents()` with an event handler. The client opens `/ws`, sends the bearer token in the first JSON frame, and waits for the server acknowledgement before it delivers events.

```js
const events = browserMail.connectEvents({
  onEvent: async (event) => {
    if (event.event_type === "message.created") {
      const message = await browserMail.messages.get(event.payload.message_id);
      renderMessage(message.data);
    }
  },
  onError: (error) => logger.error("Mail event connection failed", { error }),
});

await events.ready;
```

The server sends `{"type":"authenticated"}` before it sends events. The client resolves `ready` after it receives that frame. The client rejects `ready` if the first connection closes before authentication succeeds.

Events are notification signals. They can repeat and do not include complete message bodies or attachment bytes. Read current message data through the HTTP API. Make event handlers safe to run more than once.

## Process durable events

Use a stable `consumerId` when the application must store progress on mail-server. The client sends it as `consumer_id` when it opens the WebSocket. The server resumes from the saved cursor for that consumer.

```js
const events = browserMail.connectEvents({
  consumerId: "mail-discord-production",
  onEvent: handleEvent,
  onError: reportEventError,
});
```

The client runs one event handler at a time. After a handler succeeds, the client posts its cursor to the acknowledgement route with the same consumer ID. The client advances its cursor only after that request succeeds. If a handler or acknowledgement fails, the client reports the error, closes the socket, and stops automatic reconnects.

Do not set `after` when you set `consumerId`. The server uses the durable consumer cursor for replay and rejects requests that include both values.

Without `consumerId`, the client tracks the cursor in memory only. The client includes its current cursor when it reconnects. Store progress with `consumerId` when an application must continue after a new process starts.

The client reconnects after unexpected socket closure or a token-provider failure by default. Set `autoReconnect` to `false` to disable reconnects. Call `events.close()` to stop the connection and its reconnect timer.

## Report errors

The client throws `MailApiError` for every non-success HTTP response. The error exposes `status`, `code`, `requestId`, and `payload`. The request ID comes from the error envelope or the `x-request-id` response header.

The `payload` field contains the parsed JSON error body, plain response text, or `null` when the response body cannot be read. Network errors and token-provider errors pass through from their source. A timeout uses the platform `TimeoutError`. A caller abort uses the platform `AbortError`.

Use `onError` for WebSocket, event-handler, and event-acknowledgement failures. Catch those failures in the host application when it needs to show status or retry work.

## Configure logging

The Node.js entry uses timestamped JSON logs through `@eliware/log` by default. Set `MAIL_CLIENT_LOG_LEVEL=debug` or `LOG_LEVEL=debug` to enable debug records. Pass a logger with `debug`, `warn`, and `error` methods to use the host logger.

```js
const mail = createMailClient({
  baseUrl: process.env.MAIL_API_URL,
  getAccessToken: () => process.env.MAIL_API_TOKEN,
  logger: applicationLogger,
});
```

The browser entry has a silent logger by default and imports no Node-only logger. The client logs HTTP methods, response statuses, durations, error names, request IDs, and WebSocket lifecycle details. It does not log tokens, message bodies, attachment bytes, event payloads, or full request addresses.

## Validate a checkout

Run these commands from the package root:

```sh
npm ci
npm test
npm run typecheck
npm run smoke
npm run pack
```
