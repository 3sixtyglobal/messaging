# Mailbox Connector Gmail Examples

A connector for email ingestion from a Gmail or Google Workspace mailbox, monitoring the mailbox
through the Gmail API with OAuth 2.0 credentials.

## GmailEmailConnector

```typescript
import { GmailEmailConnector, initSchema } from '@twin.org/mailbox-connector-gmail';
import {
  EmailProtocolConnectorFactory,
  EmailProtocolConnectorConfigSchemaFactory,
  EmailProtocolConnectorStateSchemaFactory
} from '@twin.org/mailbox-models';

// Register the connector with the shared factory.
// Only the OAuth client is configured, the refresh token is issued by the consent flow
EmailProtocolConnectorFactory.register(
  GmailEmailConnector.NAMESPACE,
  () =>
    new GmailEmailConnector({
      config: {
        emailAddress: 'ingest@example.com',
        clientId: '1234567890-example.apps.googleusercontent.com',
        clientSecret: 'client-secret'
      }
    })
);

// The connector registers its config and state schemas when it is constructed. Call initSchema
// at startup as well, so a mailbox which is stored but not currently polled still has its
// secure properties recognised
initSchema();

const schema = EmailProtocolConnectorConfigSchemaFactory.get(GmailEmailConnector.NAMESPACE);
console.log(schema.filter(f => f.isSecure).map(f => f.propertyKey));
// ["clientSecret", "serviceAccountKey"]

const stateSchema = EmailProtocolConnectorStateSchemaFactory.get(GmailEmailConnector.NAMESPACE);
console.log(stateSchema.map(f => f.propertyKey));
// ["refreshToken", "historyId", "syncPageTokens", "syncCompletedLabelIds",
//  "initialSyncComplete", "deliveredMessageIds"]
console.log(stateSchema.filter(f => f.isSecure).map(f => f.propertyKey));
// ["refreshToken"]
```

## Monitoring a mailbox

```typescript
import { GmailEmailConnector } from '@twin.org/mailbox-connector-gmail';
import type { IGmailEmailConnectorState } from '@twin.org/mailbox-connector-gmail';
import type {
  IEmailProtocolConnectorAuthCallback,
  IEmailProtocolConnectorRetrievalCallback
} from '@twin.org/mailbox-models';

const connector = new GmailEmailConnector({
  config: {
    emailAddress: 'ingest@example.com',
    clientId: '1234567890-example.apps.googleusercontent.com',
    clientSecret: 'client-secret',
    // Any message carrying one of these labels is delivered
    labelIds: ['INBOX', 'Label_12'],
    maxMessagesPerPoll: 50,
    pollingIntervalMinutes: 2
  }
});

// State persisted between poll cycles; tracks the mailbox history position and carries the
// refresh token the consent flow issued
const state: IGmailEmailConnectorState = {};

const authCallback: IEmailProtocolConnectorAuthCallback = async (
  mailboxId,
  updatedState,
  requiresAuth,
  authState,
  authError
) => {
  if (requiresAuth) {
    // Raised both before the first consent and after a refresh token is revoked
    console.log(`Mailbox ${mailboxId} is awaiting consent`);
    console.log(authState?.authUrl); // send the operator here to issue a refresh token
  }
};

const retrievalCallback: IEmailProtocolConnectorRetrievalCallback = async (
  mailboxId,
  message,
  updatedState,
  retrievalError
) => {
  if (retrievalError !== undefined) {
    console.log(retrievalError.message); // description of the retrieval problem
  }

  if (message !== undefined) {
    console.log(message.subject); // e.g. "Project update"
    console.log(message.flags); // Gmail label ids, e.g. ["INBOX", "UNREAD"]
    console.log(message.htmlContent !== undefined); // true when an HTML part is present
  }

  // Persist updatedState so the next cycle resumes from the same mailbox history position,
  // then return false if the message could not be stored so it is delivered again
  return true;
};

// Start the polling loop; the scheduler fires it every pollingIntervalMinutes.
// The callback URI is fixed for the deployment and owned by the mailbox service, which also
// supplies the correlation state carrying the partition and the mailbox through the flow
await connector.retrieve('mailbox-abc', state, authCallback, retrievalCallback, {
  callbackUri: 'https://app.example.com/mailbox/authcallback',
  correlationState: 'tenant-a/mailbox-abc'
});

// Stop polling when the mailbox is removed or disabled
await connector.retrieveStop();
```

## Starting the consent flow

A mailbox which has no refresh token yet can be handed its consent URL straight away, without
waiting for the first poll to report it. `MailboxService.createMailbox` calls this when a mailbox is
created and returns the auth state to the caller, so this is only needed when driving a connector
directly.

```typescript
const authState = await connector.initiateAuth('mailbox-abc', state, {
  callbackUri: 'https://app.example.com/mailbox/authcallback',
  correlationState: 'tenant-a/mailbox-abc'
});

// Undefined when a service account key is configured, or the state already holds a token
console.log(authState?.authUrl); // send the operator here to issue a refresh token
```

## Completing the consent flow

The redirect handler exchanges the authorisation code and reports the issued token through the
auth callback the connector was given by `retrieve`, in the state it hands back. Going through
`MailboxService.completeAuth` does the correlating, persisting, vaulting and connector restart, so
this is only needed when driving a connector directly.

```typescript
// The redirect arrives at the fixed callback URI as ?code=...&state=<correlationState>
await connector.completeAuth(
  mailboxId,
  { code: authorizationCode },
  {
    callbackUri: 'https://app.example.com/mailbox/authcallback',
    correlationState: 'tenant-a/mailbox-abc'
  }
);

// The auth callback is invoked with requiresAuth false and a state carrying the issued
// refreshToken, which the state schema marks as secure so it belongs in the vault rather than
// in a log or alongside the rest of the persisted state
console.log(state.refreshToken !== undefined); // true
```

## Using a service account with domain-wide delegation

```typescript
import { GmailEmailConnector } from '@twin.org/mailbox-connector-gmail';

const connector = new GmailEmailConnector({
  config: {
    emailAddress: 'ingest@example.com',
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  }
});

console.log(connector.className()); // "GmailEmailConnector"
```
