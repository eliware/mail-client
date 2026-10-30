# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/mail-client [![npm](https://img.shields.io/npm/v/@eliware/mail-client)](https://www.npmjs.com/package/@eliware/mail-client) [![License](https://img.shields.io/github/license/eliware/mail-client)](https://github.com/eliware/mail-client/blob/main/LICENSE) [![CI](https://github.com/eliware/mail-client/actions/workflows/ci.yaml/badge.svg)](https://github.com/eliware/mail-client/actions/workflows/ci.yaml)

Mail client library for the Eliware mail platform.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [API](#api)
- [Packaging](#packaging)
- [Examples](#examples)
- [Support](#support)
- [Links](#links)
- [License](#license)

## Features

Call the mail-server API from Node.js and browser applications. Receive WebSocket events and preserve server response envelopes.

## Requirements

Use Node.js 26 or later. Browser applications require Fetch, Headers, AbortSignal, and URL APIs.

## Setup

Install the package with `npm install @eliware/mail-client`. Read the [usage guide](docs/usage.md) to configure the API URL and bearer-token provider.

## Usage

Read the [usage guide](docs/usage.md), [API reference](docs/api.md), and [release notes](RELEASE_NOTES.md). Find runnable examples in [examples/README.md](examples/README.md).

## Development

Read [AGENTS.md](AGENTS.md), [documentation](docs/README.md), and [specifications](specs/README.md) before changing files. Run `npm ci` to install locked dependencies.

## Testing

Run `npm test` for aggregate checks. Run `npm run smoke` for an HTTP and WebSocket check.

## Troubleshooting

Read the [troubleshooting guide](docs/troubleshooting.md) for common API and connection problems.

## Security

Keep long-lived API tokens in server-side secret stores. Do not expose them to browser code or logs.

## API

Read the [API reference](docs/api.md) for client options, methods, events, logging, and errors.

## Packaging

Follow approved release steps before you publish a version. Read [release notes](RELEASE_NOTES.md) for package changes.

## Examples

Read [examples/README.md](examples/README.md) for prerequisites, commands, and expected output.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## Links

- [Home Page](https://eliware.org)
- [GitHub Org](https://github.com/eliware)
- [GitHub Repo](https://github.com/eliware/mail-client)
- [Bug Reports](https://github.com/eliware/mail-client/issues)
- [npm](https://www.npmjs.com/package/@eliware/mail-client)
- [Discord](https://discord.gg/M6aTR9eTwN)

## License

[MIT © Eliware](LICENSE)
