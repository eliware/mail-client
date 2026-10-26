# API reference

The package root exports `createMailClient` and `MailApiError`.

## Client options

| Option           | Required | Purpose                                                      |
| ---------------- | -------- | ------------------------------------------------------------ |
| `baseUrl`        | Yes      | HTTP or HTTPS base address for mail-server.                  |
| `getAccessToken` | Yes      | Returns the bearer token for each request or socket session. |
| `fetchImpl`      | No       | Supplies a Fetch implementation.                             |
| `WebSocketImpl`  | No       | Supplies a WebSocket constructor.                            |
| `timeoutMs`      | No       | Sets the HTTP timeout. The default is 15000 milliseconds.    |
| `logger`         | No       | Supplies `debug`, `warn`, and `error` methods.               |

The base URL must not contain credentials, a path, a query, or a fragment. The client blocks request paths outside that address.

## HTTP methods

All JSON methods return the server response envelope without reshaping it. The envelope includes `data` and `request_id`.

| Method                                   | Mail-server route                     |
| ---------------------------------------- | ------------------------------------- |
| `auth.requestBrowserToken()`             | `POST /api/auth/token`                |
| `status()`                               | `GET /api/status`                     |
| `inbox.list(filters)`                    | `GET /api/inbox`                      |
| `messages.list(filters)`                 | `GET /api/messages`                   |
| `messages.unreadCount()`                 | `GET /api/messages/unread-count`      |
| `messages.get(id)`                       | `GET /api/messages/{id}`              |
| `messages.headers(id)`                   | `GET /api/messages/{id}/headers`      |
| `messages.thread(id)`                    | `GET /api/messages/{id}/thread`       |
| `messages.update(id, changes)`           | `PATCH /api/messages/{id}`            |
| `messages.delete(id)`                    | `DELETE /api/messages/{id}`           |
| `search(query)`                          | `GET /api/search?q={query}`           |
| `sent.list(filters)`                     | `GET /api/sent`                       |
| `sent.get(id)`                           | `GET /api/sent/{id}`                  |
| `sent.status(id)`                        | `GET /api/sent/{id}/status`           |
| `sent.retry(id)`                         | `POST /api/sent/{id}/retry`           |
| `sent.cancel(id)`                        | `POST /api/sent/{id}/cancel`          |
| `sent.retryUncertain(id, options)`       | `POST /api/sent/{id}/retry-uncertain` |
| `sent.delete(id)`                        | `DELETE /api/sent/{id}`               |
| `domains.list()`                         | `GET /api/domains`                    |
| `domains.create(domain)`                 | `POST /api/domains`                   |
| `domains.delete(domain)`                 | `DELETE /api/domains/{domain}`        |
| `send(message)`                          | `POST /api/send`                      |
| `sendMultipart(formData)`                | `POST /api/send-multipart`            |
| `attachments.download(id)`               | `GET /api/attachments/{id}`           |
| `events.read(options)`                   | `GET /api/events`                     |
| `events.acknowledge(consumerId, cursor)` | `POST /api/events/ack`                |

Use `request(path, options)` for a native `Response`. Use `requestJson(path, options)` for an unmodified JSON body. Both methods send requests once. Add an idempotency key to send data to prevent duplicate sends.

The attachment method returns the native response so callers can read bytes and metadata headers. `sent.retryUncertain()` requires a send ID and confirmation of duplicate risk.

## Errors

`MailApiError` extends `Error`. It exposes `status`, `code`, `requestId`, and `payload`. It uses the server request ID from the error envelope or `x-request-id` header when available.

## WebSocket methods

Call `connectEvents(options)` to open `/ws`. The client puts only the optional `after` cursor in the URL. After the socket opens, it sends `{"type":"authenticate","token":"..."}` as the first frame. It waits for `{"type":"authenticated"}` before it delivers events.

| Option                | Purpose                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `onEvent(event)`      | Processes an event. Return a promise to wait for processing before acknowledgement. |
| `onError(error)`      | Receives socket and event processing errors.                                        |
| `after`               | Starts replay after a decimal cursor.                                               |
| `consumerId`          | Enables durable cursor acknowledgement.                                             |
| `autoReconnect`       | Reconnects after recoverable closure. Defaults to `true`.                           |
| `retryDelayMs`        | Sets the first reconnect wait interval. Defaults to 500.                            |
| `maxReconnectDelayMs` | Sets the longest reconnect wait interval. Defaults to 30000.                        |
| `WebSocketImpl`       | Overrides the client-level WebSocket constructor.                                   |

The returned connection exposes `ready`, the last acknowledged `cursor`, and `close()`. With a consumer ID, the client calls the HTTP acknowledgement route after each event handler succeeds. It advances the cursor after the acknowledgement succeeds.

## Runtime entries

Node.js imports the package default entry and uses `@eliware/log` by default. Browsers select the `browser` export, which has no Node-only logging import and uses a silent logger by default.
