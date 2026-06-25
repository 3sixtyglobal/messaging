# TWIN Messaging

This repository contains a set of modular components that make it easier to model, deliver, and orchestrate messaging workflows across different runtime environments. The packages are designed to work together through shared contracts so teams can compose reliable messaging behaviour without duplicating core logic.

Together, these modules provide a foundation for consistent message structures, connector-level integrations, and service-level coordination. The result is a maintainable messaging stack that supports integration flexibility while keeping implementation boundaries clear.

## Packages

- [messaging-models](packages/messaging-models/README.md) - Defines the shared models and factory helpers used by messaging connectors and services.
- [messaging-connector-aws](packages/messaging-connector-aws/README.md) - Provides connectors for sending email, SMS, and push notifications through AWS messaging services.
- [messaging-connector-entity-storage](packages/messaging-connector-entity-storage/README.md) - Provides connectors that persist and manage messaging operations using entity storage.
- [messaging-service](packages/messaging-service/README.md) - Implements the messaging service layer that orchestrates delivery workflows across connectors.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)
