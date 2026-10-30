# API reference

The package root exports `createMailClient` and `MailApiError`. The TypeScript declarations live in the package and describe these exports.

## Create a client

Call `createMailClient(options)` to create an HTTP and WebSocket client.

| Option           | Required | Default                                     | Description                                    |
| ---------------- | -------- | ------------------------------------------- | ---------------------------------------------- |
| `baseUrl`        | Yes      | None                                        | HTTP or HTTPS base address for mail-server.    |
| `getAccessToken` | Yes      | None                                        | Returns a bearer token as a string or promise. |
| `fetchImpl`      | No       | `globalThis.fetch`                          | Supplies the Fetch function for HTTP requests. |
| `WebSocketImpl`  | No       | `globalThis.WebSocket`                      | Supplies the WebSocket constructor.            |
| `timeoutMs`      | No       | `15000`                                     | Sets the timeout for each HTTP request.        |
| `logger`         | No       | Node.js: `@eliware/common`, browser: silent | Supplies `debug`, `warn`, and `error` methods. |

Use an HTTP or HTTPS base address without a path, query, fragment, user name, or password. The client resolves request paths on that address. A leading `//` becomes one root slash. Absolute URLs must use the configured address.

The token provider runs before each HTTP request and each new WebSocket connection. It must return a non-empty string. The client does not inspect token claims or refresh tokens by itself.

The client combines the request timeout with a caller-provided `AbortSignal`. When one signal aborts, Fetch receives the combined signal. The client does not retry failed requests.

## HTTP request methods

### `request(path, options)`

Send an authenticated HTTP request and receive its native `Response`.

```js
const response = await mail.request("/api/status");
const envelope = await response.json();
```

The client sets `Accept: application/json` and `Authorization: Bearer <token>`. It uppercases the HTTP method. It serializes plain object bodies as JSON and sets the JSON content type when needed. It passes these body types through unchanged: strings, `FormData`, `Blob`, `URLSearchParams`, and byte arrays.

The client throws `MailApiError` for every non-2xx response. Use the native response from a 2xx call for binary data, streaming, and headers.

### `requestJson(path, options)`

Send an authenticated HTTP request and return the parsed JSON body. The method does not unwrap the server envelope.

```js
const envelope = await mail.requestJson("/api/status");
console.log(envelope.data, envelope.request_id);
```

Use `request()` when a route returns a body that is not JSON. Use `requestJson()` only when the route returns JSON.

## JSON response shape

A 2xx JSON route returns the mail-server envelope:

```json
{
  "data": {},
  "request_id": "request-id"
}
```

The client keeps the envelope unchanged. Common data fields include `messages` for message lists, `results` for query results, and `readiness.ready` for status. Read the route response for its complete data shape.

## API methods

All methods in this table return the complete JSON envelope, except `attachments.download()`, which returns a native `Response`.

| Method                                    | Route                                  | Notes                                                        |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `auth.requestBrowserToken()`              | `POST /api/auth/token`                 | Requests a short-lived browser token.                        |
| `status()`                                | `GET /api/status`                      | Returns API and dependency state.                            |
| `inbox.list(filters)`                     | `GET /api/inbox`                       | Lists inbound messages.                                      |
| `messages.list(filters)`                  | `GET /api/messages`                    | Lists messages.                                              |
| `messages.unreadCount()`                  | `GET /api/messages/unread-count`       | Returns the unread count.                                    |
| `messages.get(id)`                        | `GET /api/messages/{id}`               | Reads a message and attachment metadata.                     |
| `messages.headers(id)`                    | `GET /api/messages/{id}/headers`       | Reads message headers.                                       |
| `messages.thread(id)`                     | `GET /api/messages/{id}/thread`        | Reads the message conversation.                              |
| `messages.update(id, changes)`            | `PATCH /api/messages/{id}`             | Changes only the supplied message fields.                    |
| `messages.delete(id)`                     | `DELETE /api/messages/{id}`            | Deletes a message.                                           |
| `messages.saveDiscordLink(id, link)`      | `PUT /api/messages/{id}/discord-links` | Saves an inbound message link.                               |
| `search(query)`                           | `GET /api/search?q={query}`            | Finds matching inbound and sent messages.                    |
| `sent.list(filters)`                      | `GET /api/sent`                        | Lists sent messages.                                         |
| `sent.get(id)`                            | `GET /api/sent/{id}`                   | Reads a sent message, attachments, deliveries, and attempts. |
| `sent.status(id)`                         | `GET /api/sent/{id}/status`            | Reads status, deliveries, and attempts.                      |
| `sent.retry(id)`                          | `POST /api/sent/{id}/retry`            | Retries eligible sends.                                      |
| `sent.cancel(id)`                         | `POST /api/sent/{id}/cancel`           | Cancels eligible sends.                                      |
| `sent.retryUncertain(id, options)`        | `POST /api/sent/{id}/retry-uncertain`  | Requires duplicate-risk confirmation.                        |
| `sent.delete(id)`                         | `DELETE /api/sent/{id}`                | Deletes a sent message record.                               |
| `sent.saveDiscordLink(id, link)`          | `PUT /api/sent/{id}/discord-links`     | Saves a sent message link.                                   |
| `discordLinks.find(channelId, messageId)` | `GET /api/discord-links`               | Finds a mail record by its Discord link.                     |
| `domains.list()`                          | `GET /api/domains`                     | Lists managed domains.                                       |
| `domains.create(domain)`                  | `POST /api/domains`                    | Adds a managed domain.                                       |
| `domains.delete(domain)`                  | `DELETE /api/domains/{domain}`         | Removes a managed domain.                                    |
| `send(message)`                           | `POST /api/send`                       | Queues a JSON send request.                                  |
| `sendMultipart(formData)`                 | `POST /api/send-multipart`             | Queues a multipart send request.                             |
| `attachments.download(id)`                | `GET /api/attachments/{id}`            | Returns attachment bytes and response headers.               |
| `events.read(options)`                    | `GET /api/events`                      | Reads event records after an optional cursor.                |
| `events.acknowledge(consumerId, cursor)`  | `POST /api/events/ack`                 | Saves a durable consumer cursor.                             |

Pass a non-empty ID to methods that read or change one item. The client converts path IDs to strings and URL-encodes them.

Pass `discordChannelId` and `discordMessageId` as decimal Discord Snowflake strings to each `saveDiscordLink()` method. The client rejects zero, non-decimal, and out-of-range IDs before it sends a request. A save method returns `data.message_id` or `data.outbound_id`, plus the Discord links in `data.discord_links`. The `discordLinks.find()` method returns `data.mail_kind` and `data.mail_id`. These methods preserve standard `MailApiError` failures.

## List filters

Pass filter objects to `inbox.list()`, `messages.list()`, `sent.list()`, and `events.read()`. The client omits `null` and `undefined` values. It encodes array values as repeated query parameters.

Inbound routes accept filters such as `limit`, `before`, `after`, `query`, `folder`, `domain`, `address`, `from`, and `to`. Sent routes accept `limit`, `before`, `after`, `query`, `from`, and `to`. Mail-server validates, caps, or ignores filters according to its API contract.

`events.read()` returns `data.events`, `data.next_cursor`, and `data.has_more`. It maps `consumerId` to the `consumer_id` query parameter. It rejects calls that include both `after` and `consumerId`.

The event acknowledgement method maps `consumerId` to `consumer_id` in its JSON body. Pass a stable consumer ID and a decimal cursor string.

## Send data

Pass a JSON object to `send()`. Common fields include `from`, `to`, `cc`, `bcc`, `subject`, `body`, `html`, `attachments`, `idempotencyKey`, `replyToMessageId`, `replyMode`, and `forwardMessageId`.

Use `replyMode` values `reply`, `reply-all`, or `forward` with the matching source-message field. Mail-server decides which send actions the caller may use and which sender addresses it accepts.

The library does not retry any request. Include a stable idempotency key when the application retries a send after an uncertain network result. `sent.retryUncertain()` also requires `{ deliveryId, confirmDuplicateRisk: true }`.

For file uploads, create a native `FormData` object and call `sendMultipart(formData)`. Append fields accepted by the mail-server multipart route. Do not set the multipart content type manually.

## Attachments

Call `attachments.download(id)` to receive a `Response`. Use `response.body` to process large files as a stream. Use `response.arrayBuffer()` for a complete in-memory byte buffer. Read the response headers for metadata supplied by mail-server.

## Errors

`MailApiError` extends `Error` and represents a non-success HTTP response. It exposes these properties:

| Property    | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `status`    | HTTP response status.                                             |
| `code`      | API error code or `MAIL_API_ERROR` when no code exists.           |
| `requestId` | Request ID from the error envelope or `x-request-id` header.      |
| `payload`   | Parsed JSON, response text, or `null` if the body cannot be read. |

The error message uses the API error message when available. Network errors and token-provider errors pass through without conversion to `MailApiError`. Timeouts and caller cancellations use the platform error types.

## WebSocket event methods

### `connectEvents(options)`

Open the `/ws` route and receive event notifications. The WebSocket URL uses `ws` for an HTTP base address and `wss` for an HTTPS base address. The client puts the optional `after` cursor in the URL and excludes tokens.

After the socket opens, the client sends this JSON frame as its first message:

```json
{ "type": "authenticate", "token": "<bearer-token>" }
```

The client waits for this server frame before it delivers events:

```json
{ "type": "authenticated" }
```

| Option                | Default       | Description                                                                 |
| --------------------- | ------------- | --------------------------------------------------------------------------- |
| `onEvent(event)`      | Required      | Processes one JSON event. A returned promise delays cursor acknowledgement. |
| `onError(error)`      | No operation  | Receives socket, handler, and acknowledgement errors.                       |
| `logger`              | Client logger | Overrides the logger for this event connection.                             |
| `after`               | Live edge     | Starts event replay after a decimal cursor.                                 |
| `consumerId`          | None          | Enables server-side cursor acknowledgements.                                |
| `autoReconnect`       | `true`        | Reconnects after unexpected closure.                                        |
| `retryDelayMs`        | `500`         | Sets the first reconnect wait interval.                                     |
| `maxReconnectDelayMs` | `30000`       | Sets the longest reconnect wait interval.                                   |
| `WebSocketImpl`       | Client option | Overrides the WebSocket constructor for this connection.                    |

The connection object exposes `ready`, `cursor`, and `close()`. The `ready` promise resolves after the first authentication acknowledgement. It rejects if the first token request fails or the socket closes before authentication. A rejected token request retries automatically when `autoReconnect` is enabled. An invalid token value or WebSocket construction error stops automatic reconnects.

The server accepts cursors from `0` through the maximum Snowflake ID. It requires decimal strings without leading zeroes, except for `0` itself.

The client calls one event handler at a time. With `consumerId`, it acknowledges an event after its handler succeeds. It advances `cursor` only after the server accepts that acknowledgement. If event handling or acknowledgement fails, the client reports the error, closes the socket, and stops automatic reconnects.

Without `consumerId`, `cursor` remains in memory and is used when the connection reconnects. Store the cursor outside the client if it must survive a new process start. Make event handlers safe to run more than once.

The event has `event_id`, `cursor`, `event_type`, `occurred_at`, and `payload` fields. Event payloads signal that data changed. Read complete message data through HTTP methods.

## Runtime logging

The Node.js entry uses timestamped JSON logs through `@eliware/common` by default. Set `MAIL_CLIENT_LOG_LEVEL` or `LOG_LEVEL` to `debug` to enable debug records. The browser entry has no Node-only logging import and uses a silent logger by default. Supply an object with `debug`, `warn`, and `error` methods to inject a logger.

The client logs HTTP methods, response statuses, durations, error names, request IDs, and WebSocket lifecycle details. It does not log bearer tokens, message bodies, attachment bytes, event payloads, or full request addresses. Pass `logger` in event connection options to override the client logger for a WebSocket connection.
