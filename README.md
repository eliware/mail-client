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

Call the mail-server HTTP API and receive WebSocket events from Node.js and browser applications.
Provide bearer tokens through the host application and keep API responses available to callers.

## Requirements

Use Node.js 26 or later. Browser applications require Fetch, Headers, AbortSignal, and URL APIs.

## Setup

After the npm release, install the package with `npm install @eliware/mail-client`.
Set the mail API URL and a bearer-token provider in the host application.
Read the [usage guide](docs/usage.md) for configuration details.

## Usage

Read the [usage guide](docs/usage.md) and [release notes](RELEASE_NOTES.md).
The [basic example](examples/README.md) requests mail API status.

## Development

Read [AGENTS.md](AGENTS.md) before changing files.
Read the [documentation index](docs/README.md) and [specifications index](specs/README.md) for package guidance.
Run `npm ci` to install locked dependencies.

## Testing

Run `npm test` for aggregate checks.
Run `npm run smoke` for a local HTTP and WebSocket check.
Run `npm run typecheck` to check TypeScript declarations.
Run `npm run pack` to check package contents.

## Troubleshooting

Check the API URL, bearer-token provider, and network access when a request fails.
Read the [API reference](docs/api.md) for errors and response details.

## Security

Keep API keys and temporary credentials in approved secret stores.
Do not log bearer tokens.
Do not expose static API keys to browser code.

## API

Read the [API reference](docs/api.md) for client options, methods, events, logging, and errors.

## Packaging

Use the npm publication workflow with provenance.
Use version tags that match `package.json`.
Follow approved release steps before you publish a tag.

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
