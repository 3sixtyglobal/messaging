# 3Sixty Mailbox Connector Gmail

This package implements a Gmail connector for email mailbox ingestion.

## Installation

```shell
npm install @3sixty/mailbox-connector-gmail
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)

## Origin

This package is derived from the original [iotaledger/twin-messaging](https://github.com/iotaledger/twin-messaging/tree/next/packages/mailbox-connector-gmail) repository.

## Testing

If you want to run tests against a live account you need to have a Google App configured with the following steps:

## Setup Google App

### Create a Google Cloud Project

Go to the Google Cloud Console. <https://console.cloud.google.com>
Create a new project (or use an existing one): e.g. twin-messaging-test
In the Cloud Console, navigate to APIs & Services → Library.

### Enable the Gmail API

In the Cloud Console, navigate to APIs & Services → Library.
Search for Gmail API and enable it.

### Configure OAuth Consent Screen

Go to APIs & Services → OAuth consent screen.
Choose External if you’re testing with personal Gmail accounts.
Fill in the required fields (app name, support email, developer contact).
Save and continue.

### Create an OAuth Client

Click Create OAuth client.
Choose Web application.
Give it a name (e.g. twin-messaging-oauth-test-client).
Add your Authorized redirect URIs (for local dev, something like <http://localhost:3000/mailbox/authcallback>).

This should create the ClientId and Client Secret you need to configure the mailbox

ClientId: `25137....esu.apps.googleusercontent.com`
Client Secret: `GOCSPX-DFB....e8QL`

### Add scopes

Goto <https://console.cloud.google.com/auth/scopes>
Manually add a scope: <https://www.googleapis.com/auth/gmail.readonly>

### Setup the .env.dev for tests

```env
TEST_GMAIL_EMAIL_ADDRESS=mail@example.com
TEST_GMAIL_CLIENT_ID=25137....esu.apps.googleusercontent.com
TEST_GMAIL_CLIENT_SECRET=GOCSPX-DFB....e8QL
TEST_GMAIL_LIVE=true
```

When running the tests it will open a browser for the consent workflow.
