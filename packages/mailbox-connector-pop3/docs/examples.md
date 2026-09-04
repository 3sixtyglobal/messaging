# Mailbox Connector POP3 Examples

A polling connector for email ingestion via the POP3 protocol.

## Pop3EmailConnector

```typescript
import {
  Pop3EmailConnector,
  Pop3EmailConnectorConfigSchema
} from '@twin.org/mailbox-connector-pop3';
import {
  EmailProtocolConnectorFactory,
  EmailProtocolConnectorSchemaFactory
} from '@twin.org/mailbox-models';

// Register the connector and its config schema with the shared factories
EmailProtocolConnectorFactory.register(
  Pop3EmailConnector.NAMESPACE,
  () =>
    new Pop3EmailConnector({
      config: {
        host: 'pop3.example.com',
        username: 'user@example.com',
        password: 'secret'
      }
    })
);

EmailProtocolConnectorSchemaFactory.register(
  Pop3EmailConnector.NAMESPACE,
  () => Pop3EmailConnectorConfigSchema
);

const schema = EmailProtocolConnectorSchemaFactory.get(Pop3EmailConnector.NAMESPACE);
console.log(schema.find(f => f.isSecure)?.propertyKey); // "password"
```

```typescript
import { Pop3EmailConnector } from '@twin.org/mailbox-connector-pop3';
import type { IPop3EmailConnectorState } from '@twin.org/mailbox-connector-pop3';
import type {
  IEmailProtocolConnectorAuthCallback,
  IEmailProtocolConnectorRetrievalCallback
} from '@twin.org/mailbox-models';

const connector = new Pop3EmailConnector({
  config: {
    host: 'pop3.example.com',
    port: 995,
    secure: true,
    username: 'user@example.com',
    password: 'secret',
    batchSize: 10,
    retainMessages: true,
    pollingIntervalMinutes: 5
  }
});

// State persisted between poll cycles; tracks the highest message number seen
const state: IPop3EmailConnectorState = {};

const authCallback: IEmailProtocolConnectorAuthCallback = async (
  mailboxId,
  requiresAuth,
  updatedState,
  error,
  authState
) => {
  if (requiresAuth) {
    console.log(`Mailbox ${mailboxId} needs re-authentication`);
  }
};

const retrievalCallback: IEmailProtocolConnectorRetrievalCallback = async (
  mailboxId,
  messages,
  updatedState,
  error
) => {
  console.log(messages.length); // number of messages in this batch
  for (const message of messages) {
    console.log(message.subject); // e.g. "Invoice #4321"
    console.log(message.from?.address); // e.g. "billing@example.com"
  }
  if (error !== undefined) {
    console.log(error.message); // description of the retrieval problem
  }
};

// Start the polling loop; the scheduler fires it every pollingIntervalMinutes
await connector.retrieve('mailbox-abc', state, authCallback, retrievalCallback);

// Stop polling when the mailbox is removed or disabled
await connector.retrieveStop();
```
