# 3Sixty Mailbox Connector IMAP

This package implements an IMAP connector for email mailbox ingestion.

## Installation

```shell
npm install @3sixty/mailbox-connector-imap
```

## Docker

To perform testing of this component it may be necessary to launch a local instance to communicate with.

```shell
docker run -p 53025:3025 -p 58027:8080 -p 53143:3143 --name 3sixty-messaging-imap -d -e GREENMAIL_OPTS="-Dgreenmail.setup.test.all -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=test:test@localhost -Dgreenmail.verbose" greenmail/standalone:2.1.3
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)

## Origin

This package is derived from the original [iotaledger/twin-messaging](https://github.com/iotaledger/twin-messaging/tree/next/packages/mailbox-connector-imap) repository.
