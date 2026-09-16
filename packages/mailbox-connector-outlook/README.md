# TWIN Mailbox Connector Outlook

This package implements an Outlook connector for email mailbox ingestion.

## Installation

```shell
npm install @twin.org/mailbox-connector-outlook
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)

## Testing

Microsoft Graph has no local emulator equivalent to the `greenmail` container used by the IMAP
connector, so the unit tests mock the Graph API. To run the tests against a live mailbox you need a
Microsoft Entra ID app registration configured with the following steps.

## Setup the app registration

### Register the application

Go to the Microsoft Entra admin centre. <https://entra.microsoft.com>
Navigate to Identity, then Applications, then App registrations, and choose New registration.
Give it a name (e.g. twin-messaging-outlook-test-client).
For supported account types choose Accounts in this organizational directory only, unless you are
testing with personal Microsoft accounts.
Add a Web redirect URI (for local dev, `http://localhost:3000/mailbox/authcallback`).

The overview page then shows the identifiers you need to configure the mailbox.

Directory (tenant) ID: `72f988bf-....-2d7cd011db47`
Application (client) ID: `4a1c9e2b-....-9f3e6b1a8c05`

### Create a client secret

Go to Certificates & secrets, then Client secrets, and choose New client secret.
Copy the value straight away, it is only shown once.

Client Secret: `Xy8_Q~....~a1B`

A certificate can be used instead of a secret, in which case supply the `clientCertificate`
configuration as a JSON string carrying the PEM encoded `privateKey` and the `thumbprintSha256` of
the certificate.

### Add the permissions

Go to API permissions, then Add a permission, then Microsoft Graph.
For a mailbox a user consents to, choose Delegated permissions and add `Mail.Read`.
For a shared or service mailbox with no user present, choose Application permissions, add
`Mail.Read`, and have an administrator grant consent. Set `appOnlyAccess` to true on the mailbox
configuration, and scope the application permission to the mailboxes it may read with an
application access policy, otherwise it can read every mailbox in the tenant.

<https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access>

### Setup the .env.dev for tests

```env
TEST_OUTLOOK_EMAIL_ADDRESS=mail@example.com
TEST_OUTLOOK_TENANT_ID=72f988bf-....-2d7cd011db47
TEST_OUTLOOK_CLIENT_ID=4a1c9e2b-....-9f3e6b1a8c05
TEST_OUTLOOK_CLIENT_SECRET=Xy8_Q~....~a1B
TEST_OUTLOOK_LIVE=true
```

When running the tests it will open a browser for the consent workflow.
