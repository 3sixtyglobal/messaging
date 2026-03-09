# Messaging Packages

## messaging-models

This package provides the shared messaging models and factory helpers used by connectors and services across the repository. It establishes a common contract for payloads, metadata, and processing inputs so implementations can remain interoperable and consistent.

- [README](../packages/messaging-models/README.md)
- [Examples](../packages/messaging-models/docs/examples.md)
- [Changelog](../packages/messaging-models/docs/changelog.md)

## messaging-connector-aws

This package provides connectors for sending email, SMS, and push notifications through AWS messaging services. It enables integration with managed cloud capabilities from [Amazon Web Services](https://aws.amazon.com/) while preserving the shared messaging interfaces used by the wider codebase.

- [README](../packages/messaging-connector-aws/README.md)
- [Examples](../packages/messaging-connector-aws/docs/examples.md)
- [Changelog](../packages/messaging-connector-aws/docs/changelog.md)

## messaging-connector-entity-storage

This package provides connectors that persist and manage messaging operations using entity storage. It supports durable messaging workflows where requests and delivery details must be stored, queried, and processed through a consistent persistence layer.

- [README](../packages/messaging-connector-entity-storage/README.md)
- [Examples](../packages/messaging-connector-entity-storage/docs/examples.md)
- [Changelog](../packages/messaging-connector-entity-storage/docs/changelog.md)

## messaging-service

This package implements the messaging service layer that orchestrates delivery workflows across connectors. It coordinates domain logic and integration boundaries so applications can trigger messaging behaviour through a single service-oriented interface.

- [README](../packages/messaging-service/README.md)
- [Examples](../packages/messaging-service/docs/examples.md)
- [Changelog](../packages/messaging-service/docs/changelog.md)
