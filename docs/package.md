# Package details

## Installation and support

Install the package with npm:

```sh
npm install @eliware/mail-client
```

The package supports Node.js 26 or later. Browser applications use Fetch, Headers, AbortSignal, URL, and WebSocket APIs. Use a bundler that honors the package `browser` export condition to select the browser entry.

The package root exports `createMailClient` and `MailApiError`. It includes TypeScript declarations at `src/index.d.ts`. Node.js uses `src/index.mjs`. Browser builds use `src/index.browser.mjs` and a silent logger by default.

The Node.js entry uses `@eliware/log` as a runtime dependency. The browser entry does not import the Node.js logger. Both entries expose the same client API.

## Environment values

The library accepts `baseUrl` and `getAccessToken` as required client options. It does not read API URLs or API tokens from the environment. The examples use these application-owned values:

| Value                   | Example default              | Required status                  | Purpose                                                  |
| ----------------------- | ---------------------------- | -------------------------------- | -------------------------------------------------------- |
| `MAIL_API_URL`          | `https://mail.example.test`  | Required by usage examples       | Sets the mail-server base address.                       |
| `MAIL_API_TOKEN`        | `replace-with-a-local-token` | Required by the Node.js examples | Supplies a bearer token to the example host.             |
| `MAIL_WEB_API_TOKEN`    | None                         | Required by the mail-web example | Supplies the server token for browser-token requests.    |
| `MAIL_CLIENT_LOG_LEVEL` | `LOG_LEVEL` or `info`        | Optional for the Node.js entry   | Sets the package logger level.                           |
| `LOG_LEVEL`             | `info`                       | Optional for the Node.js entry   | Sets the logger level when the package value is missing. |

The host application reads the first three values and passes them to the library. Keep long-lived tokens on trusted servers. The library reads the two log-level values in the Node.js entry. The browser entry does not read them.

The package requires `baseUrl` and `getAccessToken` when you create a client. The environment values above belong to the example host applications. Only the two log-level values come from the library process environment.

## Package contents

The npm package includes `src/`, `docs/`, `examples/`, `specs/`, `README.md`, `AGENTS.md`, `LICENSE`, `RELEASE_NOTES.md`, and `package.json`. These paths contain runtime entries, declarations, user guides, examples, and package metadata.

The package does not include tests, fixtures, coverage output, or the lockfile. npm installs the runtime dependency declared in `package.json`.

## Versions and publication

The package uses numeric `MAJOR.MINOR.PATCH` versions. Each release tag follows `vMAJOR.MINOR.PATCH` and matches `package.json`.

The GitHub publication workflow tests each tagged commit with Node.js 26 before it publishes the package. It runs `npm test`.

npm adds provenance data that identifies the GitHub Actions build that published the package. The package is public on npm under `@eliware/mail-client`.

Read [release notes](../RELEASE_NOTES.md) for changes in each published version.
