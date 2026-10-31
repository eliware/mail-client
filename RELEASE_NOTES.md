# Release Notes

## 15.0.3 — 2026-10-30

### Added

- Add a package guide for runtime support, entrypoints, environment values, package contents, and publication.

### Changed

- Set the package version to 15.0.3.
- Send `consumer_id` in durable WebSocket requests and use the server-stored consumer cursor.
- Reject `after` when a WebSocket connection uses `consumerId`.
- Keep `ready` pending while automatic reconnect retries token-provider or socket failures.
- Update locked transitive dependencies and simplify README navigation.

### Fixed

- Stop queued event handlers after an earlier event handler fails.
- Reject browser WebSocket frames that contain binary `Blob` data.

## 15.0.2 — 2026-10-30

### Added

- Add timestamped JSON logs through `@eliware/log` for HTTP and WebSocket requests.
- Add debug-level lifecycle records controlled by `MAIL_CLIENT_LOG_LEVEL` or `LOG_LEVEL`.
- Add an end-user troubleshooting guide for authentication, browser access, WebSocket events, and logs.

### Changed

- Set the package version to 15.0.2.
- Replace the direct `@eliware/common` dependency with `@eliware/log`.
- Update locked dependencies and align the README and contributor guidance with repository conventions.
- Resolve request paths that start with `//` on the configured API address.
- Keep browser logging silent by default and allow injected loggers for HTTP and WebSocket calls.

### Fixed

- Resolve the WebSocket readiness promise when event processing fails.

## 15.0.1 — 2026-10-29

### Added

- Add an authenticated HTTP client for the mail-server API.
- Add methods for message lists, domains, lookups, sends, attachments, and event cursors.
- Add WebSocket authentication, event handling, replay cursors, and reconnect support.
- Add Node.js structured logging through `@eliware/log` and a browser-safe entry.
- Add TypeScript declarations, API documentation, tests, and a local smoke check.
- Keep OAuth sign-in and consumer migrations outside this package.
