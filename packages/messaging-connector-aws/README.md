# TWIN Messaging Connector AWS

This package provides connectors for sending email, SMS, and push notifications through AWS messaging services.

## Installation

```shell
npm install @twin.org/messaging-connector-aws
```

## Testing

To perform testing of this component it may be necessary to launch a local instance to communicate with.

The tests developed are functional tests and require an AWS simulator with SES and SNS services running.
The AWS SNS simulator cannot send real SMS messages or push notifications, but it simulates server responses accordingly.

```shell
docker run -p 5151:5000 --name twin-messaging-aws -d motoserver/moto
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)

## Origin

This package is derived from the original [iotaledger/twin-messaging](https://github.com/iotaledger/twin-messaging/tree/next/packages/messaging-connector-aws) repository.
