# Messaging Packages

## mailbox-models

This package defines the shared models and factory helpers for email mailbox ingestion. It provides common interfaces, entities, and utilities that form the contract between mailbox connectors and the mailbox service, ensuring consistent handling of email data across the ingestion pipeline.

- [README](../packages/mailbox-models/README.md)
- [Examples](../packages/mailbox-models/docs/examples.md)
- [Reference](../packages/mailbox-models/docs/reference/index.md)
- [Changelog](../packages/mailbox-models/docs/changelog.md)

## mailbox-service

This package implements the mailbox service layer for email ingestion, durable message storage, and consumer notification. It coordinates the lifecycle of connected mailboxes, delegates retrieval to protocol connectors, and persists incoming messages through the entity storage layer.

- [README](../packages/mailbox-service/README.md)
- [Examples](../packages/mailbox-service/docs/examples.md)
- [Reference](../packages/mailbox-service/docs/reference/index.md)
- [Changelog](../packages/mailbox-service/docs/changelog.md)

## mailbox-rest-client

This package provides a REST client for calling mailbox service endpoints. It enables applications to interact with the mailbox service over HTTP without depending on the service implementation directly.

- [README](../packages/mailbox-rest-client/README.md)
- [Examples](../packages/mailbox-rest-client/docs/examples.md)
- [Reference](../packages/mailbox-rest-client/docs/reference/index.md)
- [Changelog](../packages/mailbox-rest-client/docs/changelog.md)

## mailbox-connector-pop3

This package provides a POP3 connector for email mailbox ingestion. It implements the email protocol connector interface, polling configured POP3 mailboxes on a schedule and delivering retrieved messages in batches to the mailbox service.

- [README](../packages/mailbox-connector-pop3/README.md)
- [Examples](../packages/mailbox-connector-pop3/docs/examples.md)
- [Reference](../packages/mailbox-connector-pop3/docs/reference/index.md)
- [Changelog](../packages/mailbox-connector-pop3/docs/changelog.md)

## mailbox-connector-imap

This package provides an IMAP connector for email mailbox ingestion. It implements the email protocol connector interface, polling configured IMAP folders on a schedule and streaming retrieved messages in batches to the mailbox service.

- [README](../packages/mailbox-connector-imap/README.md)
- [Examples](../packages/mailbox-connector-imap/docs/examples.md)
- [Reference](../packages/mailbox-connector-imap/docs/reference/index.md)
- [Changelog](../packages/mailbox-connector-imap/docs/changelog.md)

## messaging-models

This package provides the shared messaging models and factory helpers used by connectors and services across the repository. It establishes a common contract for payloads, metadata, and processing inputs so implementations can remain interoperable and consistent.

- [README](../packages/messaging-models/README.md)
- [Examples](../packages/messaging-models/docs/examples.md)
- [Reference](../packages/messaging-models/docs/reference/index.md)
- [Changelog](../packages/messaging-models/docs/changelog.md)

## messaging-connector-aws

This package provides connectors for sending email, SMS, and push notifications through AWS messaging services. It enables integration with managed cloud capabilities from [Amazon Web Services](https://aws.amazon.com/) while preserving the shared messaging interfaces used by the wider codebase.

- [README](../packages/messaging-connector-aws/README.md)
- [Examples](../packages/messaging-connector-aws/docs/examples.md)
- [Reference](../packages/messaging-connector-aws/docs/reference/index.md)
- [Changelog](../packages/messaging-connector-aws/docs/changelog.md)

## messaging-connector-entity-storage

This package provides connectors that persist and manage messaging operations using entity storage. It supports durable messaging workflows where requests and delivery details must be stored, queried, and processed through a consistent persistence layer.

- [README](../packages/messaging-connector-entity-storage/README.md)
- [Examples](../packages/messaging-connector-entity-storage/docs/examples.md)
- [Reference](../packages/messaging-connector-entity-storage/docs/reference/index.md)
- [Changelog](../packages/messaging-connector-entity-storage/docs/changelog.md)

## messaging-connector-smtp

This package provides a connector for sending emails via SMTP. It implements the email connector interface using Nodemailer and supports integration with any SMTP-compatible mail server.

- [README](../packages/messaging-connector-smtp/README.md)
- [Examples](../packages/messaging-connector-smtp/docs/examples.md)
- [Reference](../packages/messaging-connector-smtp/docs/reference/index.md)
- [Changelog](../packages/messaging-connector-smtp/docs/changelog.md)

## messaging-service

This package implements the messaging service layer that orchestrates delivery workflows across connectors. It coordinates domain logic and integration boundaries so applications can trigger messaging behaviour through a single service-oriented interface.

- [README](../packages/messaging-service/README.md)
- [Examples](../packages/messaging-service/docs/examples.md)
- [Reference](../packages/messaging-service/docs/reference/index.md)
- [Changelog](../packages/messaging-service/docs/changelog.md)
