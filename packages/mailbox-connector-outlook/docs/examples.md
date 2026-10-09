# Mailbox Connector Outlook Examples

A connector for email ingestion from an Outlook or Microsoft 365 mailbox, monitoring the mailbox
through the Microsoft Graph API with OAuth 2.0 credentials.

## OutlookEmailConnector

```typescript
import { OutlookEmailConnector, initSchema } from '@3sixty/mailbox-connector-outlook';
import {
  EmailProtocolConnectorFactory,
  EmailProtocolConnectorConfigSchemaFactory,
  EmailProtocolConnectorStateSchemaFactory
} from '@3sixty/mailbox-models';

// Register the connector with the shared factory.
// Only the app registration is configured, the refresh token is issued by the consent flow
EmailProtocolConnectorFactory.register(
  OutlookEmailConnector.NAMESPACE,
  () =>
    new OutlookEmailConnector({
      config: {
        emailAddress: 'ingest@example.com',
        tenantId: '72f988bf-0000-0000-0000-2d7cd011db47',
        clientId: '4a1c9e2b-0000-0000-0000-9f3e6b1a8c05',
        clientSecret: 'client-secret'
      }
    })
);

// The connector registers its config and state schemas when it is constructed. Call initSchema
// at startup as well, so a mailbox which is stored but not currently polled still has its
// secure properties recognised
initSchema();

const schema = EmailProtocolConnectorConfigSchemaFactory.get(OutlookEmailConnector.NAMESPACE);
console.log(schema.filter(f => f.isSecure).map(f => f.propertyKey));
// ["clientSecret", "clientCertificate"]

const stateSchema = EmailProtocolConnectorStateSchemaFactory.get(OutlookEmailConnector.NAMESPACE);
console.log(stateSchema.filter(f => f.isSecure).map(f => f.propertyKey));
// ["tokenCache"]
```

## Monitoring a mailbox

```typescript
import { OutlookEmailConnector } from '@3sixty/mailbox-connector-outlook';
import type { IOutlookEmailConnectorState } from '@3sixty/mailbox-connector-outlook';
import type {
  IEmailProtocolConnectorAuthCallback,
  IEmailProtocolConnectorRetrievalCallback
} from '@3sixty/mailbox-models';

const connector = new OutlookEmailConnector({
  config: {
    emailAddress: 'ingest@example.com',
    tenantId: '72f988bf-0000-0000-0000-2d7cd011db47',
    clientId: '4a1c9e2b-0000-0000-0000-9f3e6b1a8c05',
    clientSecret: 'client-secret',
    // Each folder is tracked with its own delta cursor, so no folder enumeration is needed
    folderIds: ['inbox', 'archive'],
    maxMessagesPerPoll: 50,
    pollingIntervalMinutes: 2
  }
});

// State persisted between poll cycles; tracks the delta cursor of each folder and carries the
// token cache holding the refresh token the consent flow issued
const state: IOutlookEmailConnectorState = {};

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
    console.log(message.flags); // Outlook categories, e.g. ["Orders"]
    console.log(message.htmlContent !== undefined); // true when an HTML part is present
  }

  // Persist updatedState so the next cycle resumes from the same delta cursor, then return
  // false if the message could not be stored so it is delivered again
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

A mailbox which has no credentials yet can be handed its consent URL straight away, without
waiting for the first poll to report it. `MailboxService.createMailbox` calls this when a mailbox is
created and returns the auth state to the caller, so this is only needed when driving a connector
directly.

```typescript
const authState = await connector.initiateAuth('mailbox-abc', state, {
  callbackUri: 'https://app.example.com/mailbox/authcallback',
  correlationState: 'tenant-a/mailbox-abc'
});

// Undefined when application only access is configured, or the state already holds credentials
console.log(authState?.authUrl); // send the operator here to issue a refresh token
```

## Completing the consent flow

The redirect handler exchanges the authorisation code and reports the issued credentials through
the auth callback the connector was given by `retrieve`, in the state it hands back. Going through
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
// tokenCache, which the state schema marks as secure so it belongs in the vault rather than in
// a log or alongside the rest of the persisted state
console.log(state.tokenCache !== undefined); // true
console.log(state.accountId !== undefined); // true, the account the consent came from
```

## Using application permissions for a shared mailbox

A shared or service mailbox has no user to consent, so the connector authenticates as the
application itself with the client credentials flow. Scope the application permission to the
mailboxes it may read with an application access policy, otherwise it can read every mailbox in
the tenant.

```typescript
import { OutlookEmailConnector } from '@3sixty/mailbox-connector-outlook';

const connector = new OutlookEmailConnector({
  config: {
    emailAddress: 'orders@example.com',
    tenantId: '72f988bf-0000-0000-0000-2d7cd011db47',
    clientId: '4a1c9e2b-0000-0000-0000-9f3e6b1a8c05',
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    appOnlyAccess: true
  }
});

// No consent flow is needed, so no auth URL is produced
console.log(
  await connector.initiateAuth(
    'mailbox-abc',
    {},
    {
      callbackUri: 'https://app.example.com/mailbox/authcallback',
      correlationState: 'tenant-a/mailbox-abc'
    }
  )
); // undefined
```

## Using a certificate instead of a client secret

```typescript
import { OutlookEmailConnector } from '@3sixty/mailbox-connector-outlook';

const connector = new OutlookEmailConnector({
  config: {
    emailAddress: 'ingest@example.com',
    tenantId: '72f988bf-0000-0000-0000-2d7cd011db47',
    clientId: '4a1c9e2b-0000-0000-0000-9f3e6b1a8c05',
    // The PEM encoded private key and the SHA-256 thumbprint of the certificate
    clientCertificate: process.env.OUTLOOK_CLIENT_CERTIFICATE
  }
});

console.log(connector.className()); // "OutlookEmailConnector"
```
