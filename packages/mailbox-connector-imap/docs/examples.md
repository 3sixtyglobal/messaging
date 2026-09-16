# Mailbox Connector IMAP Examples

A polling connector for email ingestion via the IMAP protocol, with per-folder UID tracking.

## ImapEmailConnector

```typescript
import { ImapEmailConnector, initSchema } from '@twin.org/mailbox-connector-imap';
import {
  EmailProtocolConnectorFactory,
  EmailProtocolConnectorConfigSchemaFactory,
  EmailProtocolConnectorStateSchemaFactory
} from '@twin.org/mailbox-models';

// Register the connector with the shared factory
EmailProtocolConnectorFactory.register(
  ImapEmailConnector.NAMESPACE,
  () =>
    new ImapEmailConnector({
      config: {
        host: 'imap.example.com',
        username: 'user@example.com',
        password: 'secret'
      }
    })
);

// The connector registers its config and state schemas when it is constructed. Call initSchema
// at startup as well, so a mailbox which is stored but not currently polled still has its
// secure properties recognised
initSchema();

const schema = EmailProtocolConnectorConfigSchemaFactory.get(ImapEmailConnector.NAMESPACE);
console.log(schema.find(f => f.isSecure)?.propertyKey); // "password"

const stateSchema = EmailProtocolConnectorStateSchemaFactory.get(ImapEmailConnector.NAMESPACE);
console.log(stateSchema.map(f => f.propertyKey)); // ["folders"]
// The credentials are configured, so no state property needs vaulting
console.log(stateSchema.filter(f => f.isSecure)); // []
```

```typescript
import { ImapEmailConnector } from '@twin.org/mailbox-connector-imap';
import type { IImapEmailConnectorState } from '@twin.org/mailbox-connector-imap';
import type {
  IEmailProtocolConnectorAuthCallback,
  IEmailProtocolConnectorRetrievalCallback
} from '@twin.org/mailbox-models';

const connector = new ImapEmailConnector({
  config: {
    host: 'imap.example.com',
    port: 993,
    secure: true,
    username: 'user@example.com',
    password: 'secret',
    folders: ['INBOX', 'Work/Projects'],
    batchSize: 5,
    pollingIntervalMinutes: 2
  }
});

// State persisted between poll cycles; tracks the last UID seen per folder
const state: IImapEmailConnectorState = {};

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
    console.log(message.subject); // e.g. "Project update"
    console.log(message.flags); // e.g. ["\\Seen"]
    console.log(message.htmlContent !== undefined); // true when HTML part is present
  }
  if (error !== undefined) {
    console.log(error.message); // description of the retrieval problem
  }
  // Persist updatedState to resume from the last seen UID on the next poll cycle
};

// Start the polling loop; the scheduler fires it every pollingIntervalMinutes
await connector.retrieve('mailbox-abc', state, authCallback, retrievalCallback);

// Stop polling when the mailbox is removed or disabled
await connector.retrieveStop();
```
