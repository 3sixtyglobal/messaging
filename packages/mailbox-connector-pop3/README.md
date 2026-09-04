# TWIN Mailbox Connector POP3

This package implements a POP3 connector for email mailbox ingestion.

## Installation

```shell
npm install @twin.org/mailbox-connector-pop3
```

## Docker

To perform testing of this component it may be necessary to launch a local instance to communicate with.

```shell
docker run -p 51025:3025 -p 58025:8080 -p 51110:3110 --name twin-messaging-pop3 -d -e GREENMAIL_OPTS="-Dgreenmail.setup.test.all -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=test:test@localhost -Dgreenmail.verbose" greenmail/standalone:2.1.3
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)
