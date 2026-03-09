# TWIN Messaging Connector AWS

This package provides connectors for sending email, SMS, and push notifications through AWS messaging services.

## Installation

```shell
npm install @twin.org/messaging-connector-aws
```

## Docker

To perform testing of this component it may be necessary to launch a local instance to communicate with.

The tests developed are functional tests and require an AWS simulator with SES and SNS services running.
The AWS SNS simulator cannot send real SMS messages or push notifications, but it simulates server responses accordingly.

To run AWS locally:

```shell
docker run -p 4866:4566 --name twin-messaging-aws -d localstack/localstack -e AWS_DEFAULT_REGION='eu-central-1' -e AWS_ACCESS_KEY_ID='test' -e AWS_SECRET_ACCESS_KEY='test' -e SERVICE='SNS,SES'
```

Afterwards, run the tests with:

```shell
npm run test
```

## Examples

Usage of the APIs is shown in the examples [docs/examples.md](docs/examples.md)

## Reference

Detailed reference documentation for the API can be found in [docs/reference/index.md](docs/reference/index.md)

## Changelog

The changes between each version can be found in [docs/changelog.md](docs/changelog.md)
