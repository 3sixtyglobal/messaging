# Mailbox Models Examples

Factories, callback types, and utilities shared by mailbox connectors, services, and consumers.

## MailHelper

```typescript
import { MailHelper } from '@twin.org/mailbox-models';
import type { IEmail } from '@twin.org/mailbox-models';

// Parse a raw RFC 2822 email string, with optional IMAP flags
const raw =
  'From: Alice <alice@example.com>\r\n' +
  'To: Bob <bob@example.com>\r\n' +
  'Subject: Hello\r\n' +
  'Date: Mon, 01 Sep 2026 08:00:00 +0000\r\n' +
  '\r\n' +
  'Hi Bob, just checking in.';

const email: IEmail | undefined = await MailHelper.parseEmail(raw, ['\\Seen']);
console.log(email?.subject); // "Hello"
console.log(email?.from); // { name: "Alice", address: "alice@example.com" }
console.log(email?.flags); // ["\\Seen"]
```

```typescript
import { MailHelper } from '@twin.org/mailbox-models';
import type { IEmailAddress } from '@twin.org/mailbox-models';

// Map a single address-like object; returns undefined when no address string is present
const address: IEmailAddress | undefined = MailHelper.mapAddress({
  name: 'Alice',
  address: 'alice@example.com'
});
console.log(address); // { name: "Alice", address: "alice@example.com" }

const missing = MailHelper.mapAddress({ name: 'No Address' });
console.log(missing); // undefined

// Map an array, filtering out any entry that lacks an address string
const addresses: IEmailAddress[] | undefined = MailHelper.mapAddresses([
  { name: 'Alice', address: 'alice@example.com' },
  { name: 'Bob', address: 'bob@example.com' },
  { name: 'Ghost' }
]);
console.log(addresses?.length); // 2
```

## EmailProtocolConnectorFactory

```typescript
import {
  EmailProtocolConnectorFactory,
  EmailProtocolConnectorSchemaFactory
} from '@twin.org/mailbox-models';
import type { IEmailProtocolConnector, IMailboxConfigField } from '@twin.org/mailbox-models';
import { EntitySchemaPropertyType } from '@twin.org/entity';

// Register a connector implementation under a protocol namespace
EmailProtocolConnectorFactory.register('pop3', () => {
  return {} as IEmailProtocolConnector;
});

// Register its config field schema so the service can identify secure fields for vault storage
const configSchema: IMailboxConfigField[] = [
  {
    labelKey: 'pop3.host',
    propertyKey: 'host',
    type: EntitySchemaPropertyType.String
  },
  {
    labelKey: 'pop3.password',
    propertyKey: 'password',
    type: EntitySchemaPropertyType.String,
    isSecure: true
  }
];
EmailProtocolConnectorSchemaFactory.register('pop3', () => configSchema);

const connector = EmailProtocolConnectorFactory.get('pop3');
const schema = EmailProtocolConnectorSchemaFactory.get('pop3');
console.log(schema.find(f => f.isSecure)?.propertyKey); // "password"
```

## EmailConsumerFactory

```typescript
import { EmailConsumerFactory } from '@twin.org/mailbox-models';
import type { IEmailConsumer } from '@twin.org/mailbox-models';

class NotificationConsumer implements IEmailConsumer {
  public className(): string {
    return 'NotificationConsumer';
  }

  public async onNewMessages(): Promise<void> {
    // react to newly stored messages
  }
}

// Register a consumer so the mailbox service notifies it after each retrieval cycle
EmailConsumerFactory.register('notifications', () => new NotificationConsumer());

const consumer = EmailConsumerFactory.get('notifications');
console.log(consumer.className()); // "NotificationConsumer"
```

## IEmailProtocolConnectorAuthCallback

```typescript
import type {
  IEmailProtocolConnectorAuthCallback,
  IEmailProtocolConnectorRetrievalCallback
} from '@twin.org/mailbox-models';

// Called when the connector detects an authentication failure
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

// Called after each batch of messages is retrieved (or on error)
const retrievalCallback: IEmailProtocolConnectorRetrievalCallback = async (
  mailboxId,
  messages,
  updatedState,
  error
) => {
  console.log(messages.length); // number of messages in this batch
  for (const message of messages) {
    console.log(message.subject); // e.g. "Weekly report"
    console.log(message.from?.address); // e.g. "alice@example.com"
  }
  if (error !== undefined) {
    console.log(error.message); // description of the retrieval problem
  }
};
```
