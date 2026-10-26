# Usage

Use `@eliware/mail-client` for the authenticated mail-server HTTP API and event WebSocket.

## Create a client

Pass the mail-server base address and a token provider. The client calls the provider for each HTTP request and WebSocket connection.

```js
import { createMailClient } from "@eliware/mail-client";

const mail = createMailClient({
  baseUrl: "https://mail.example.test",
  getAccessToken: async () => process.env.MAIL_API_TOKEN,
  timeoutMs: 15_000,
});

const inbox = await mail.inbox.list({ limit: 20 });
```

Use a separate long-lived API key for each trusted Node.js application or CLI installation. Store application keys in Kubernetes secrets. The mail-web server must keep its long-lived key on the server.

## Browser tokens

Let the mail-web server call `mail.auth.requestBrowserToken()` with its long-lived key. Return the short-lived token to the signed-in browser through the mail-web session. Do not store the token in browser storage.

```js
const result = await mail.auth.requestBrowserToken();
const browserToken = result.data.access_token;
```

Create a browser client with a token provider that can refresh that token when needed. EliD sign-in belongs to mail-web. This package does not run OAuth flows or depend on `@eliware/elid-client`.

```js
const browserMail = createMailClient({
  baseUrl: "https://mail.example.test",
  getAccessToken: () => session.getMailToken(),
});
```

The browser calls mail-server directly. Configure mail-server to allow the mail-web base address.

## Read and change mail

Use named methods for common API routes. These methods preserve the server's JSON envelope.

```js
const message = await mail.messages.get("123456789");
await mail.messages.update("123456789", { read: true });
const results = await mail.search("invoice");
const sent = await mail.send({ to: "eli@example.test", subject: "Hello", body: "Hi" });
```

Use `mail.request()` for other routes and attachment responses. It returns a native `Response`. Use `mail.requestJson()` when the response is JSON.

## Receive events

Pass an event handler to `connectEvents()`. The client sends the bearer token in the first JSON frame after the socket opens. It waits for the server's `authenticated` frame before it calls the handler.

```js
const events = mail.connectEvents({
  onEvent: async (event) => {
    const message = await mail.messages.get(event.payload.message_id);
    renderMessage(message.data);
  },
  onError: (error) => logger.error("Mail event stream failed", { error }),
});

await events.ready;
```

Use a stable `consumerId` when the client must continue durable processing. The client acknowledges each cursor after the handler succeeds. It advances its cursor only after the server accepts the acknowledgement. The server may repeat events, so make handlers safe to run more than once.

```js
const events = mail.connectEvents({
  consumerId: "mail-discord-production",
  after: savedCursor,
  onEvent: handleEvent,
});
```

The client reconnects with the last acknowledged cursor by default. Call `events.close()` to stop reconnects. Events are notification signals. Read complete message data through the HTTP API.

## Errors and logging

The client throws `MailApiError` for non-success HTTP responses. The error includes `status`, `code`, `requestId`, and `payload` fields. Check `requestId` when you examine a server failure.

The Node.js entry uses `@eliware/log` by default. Inject a logger with `debug`, `warn`, and `error` methods when the host owns logging. The browser entry has no default logger. The client does not log credentials, message bodies, attachment data, or full URLs.

## Validate changes

Run these commands from the repository root:

```sh
npm ci
npm test
npm run typecheck
npm run pack
```
