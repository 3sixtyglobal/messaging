# 3Sixty Messaging

This repository contains a set of modular components that make it easier to model, ingest, deliver, and orchestrate messaging workflows across different runtime environments. The packages are designed to work together through shared contracts so teams can compose reliable messaging behaviour without duplicating core logic.

The repository covers two complementary areas: email mailbox ingestion through configurable protocol connectors, and outbound message delivery across email, SMS, and push notification channels. Together, these modules provide a foundation for consistent message structures, connector-level integrations, and service-level coordination that supports integration flexibility while keeping implementation boundaries clear.

## Packages

- [mailbox-models](packages/mailbox-models/README.md) - Defines the shared models and factory helpers for email mailbox ingestion.
- [mailbox-service](packages/mailbox-service/README.md) - Implements the mailbox service layer for email ingestion, durable message storage, and consumer notification.
- [mailbox-rest-client](packages/mailbox-rest-client/README.md) - REST client for calling mailbox service endpoints.
- [mailbox-connector-pop3](packages/mailbox-connector-pop3/README.md) - POP3 connector for email mailbox ingestion.
- [mailbox-connector-imap](packages/mailbox-connector-imap/README.md) - IMAP connector for email mailbox ingestion.
- [mailbox-connector-gmail](packages/mailbox-connector-gmail/README.md) - Gmail connector for email mailbox ingestion.
- [mailbox-connector-outlook](packages/mailbox-connector-outlook/README.md) - Outlook connector for email mailbox ingestion.
- [messaging-models](packages/messaging-models/README.md) - Defines the shared models and factory helpers used by messaging connectors and services.
- [messaging-connector-aws](packages/messaging-connector-aws/README.md) - Provides connectors for sending email, SMS, and push notifications through AWS messaging services.
- [messaging-connector-entity-storage](packages/messaging-connector-entity-storage/README.md) - Provides connectors that persist and manage messaging operations using entity storage.
- [messaging-connector-smtp](packages/messaging-connector-smtp/README.md) - Provides a connector for sending emails via SMTP.
- [messaging-service](packages/messaging-service/README.md) - Implements the messaging service layer that orchestrates delivery workflows across connectors.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-messaging](https://github.com/iotaledger/twin-messaging) repository.
