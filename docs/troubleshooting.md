# Troubleshooting

Use this guide to find common mail-server API and WebSocket connection problems.

## HTTP authentication fails

Check that the token provider returns a valid bearer token for every request. Mail-client calls the provider before each HTTP request.

For browser requests, request a new short-lived token through the signed-in host application. Keep long-lived API tokens on the server.

Read the `MailApiError` status, code, and request ID. Use the request ID to find the matching mail-server log record.

## Browser requests fail

Check that mail-server allows the exact browser site address. Include the scheme and port from the browser address.

Allow the browser site address for both HTTP and WebSocket access. Check the browser network panel for CORS details.

## WebSocket events are missing

Wait for `connection.ready` before treating the connection as authenticated. The server must send `{"type":"authenticated"}` before it sends events.

Check that the token provider returns a valid token when mail-client opens or reconnects a socket. Refresh browser tokens before they expire.

Check the `onError` callback for socket, event handler, or acknowledgement failures. Event handlers must succeed before mail-client acknowledges their cursor.

## Debug logs are missing

Set `MAIL_CLIENT_LOG_LEVEL=debug` or `LOG_LEVEL=debug` before the Node.js process starts. The Node.js entry writes timestamped JSON records.

The browser entry stays silent by default. Pass a logger with `debug`, `warn`, and `error` methods to receive browser-side records.

Mail-client omits tokens, message bodies, attachment bytes, event payloads, and complete request addresses from its own records.
