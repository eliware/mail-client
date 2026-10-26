# Examples

The [basic example](basic.mjs) sends an authenticated request to the mail API status route.

## Prerequisites

Use Node.js 26 or later. Set `MAIL_API_URL` and `MAIL_API_TOKEN` in the local environment. Do not commit credentials.

## Command

Run `node examples/basic.mjs` from the repository root.

## Expected result

The example prints the JSON response from the configured mail API. The API must be reachable and the token must have access to the status route.
