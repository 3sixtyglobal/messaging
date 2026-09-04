# Mailbox REST Client Examples

REST clients for interacting with the mailbox management and email storage endpoints.

## MailboxRestClient

```typescript
import { MailboxRestClient } from '@twin.org/mailbox-rest-client';
import type { IBaseRestClientConfig } from '@twin.org/api-core';
import type { IMailbox } from '@twin.org/mailbox-models';

const config: IBaseRestClientConfig = { endpoint: 'https://api.example.com' };
const client = new MailboxRestClient(config);

// Create a mailbox and retrieve its generated ID
const id = await client.addMailbox({
  name: 'Work Inbox',
  connectorType: 'imap',
  config: { host: 'imap.example.com', username: 'user@example.com' },
  enabled: true
});
console.log(id); // "019547d0-..."

const mailbox: IMailbox = await client.getMailbox(id);
console.log(mailbox.name); // "Work Inbox"
console.log(mailbox.enabled); // true

// Update the mailbox
await client.updateMailbox({ ...mailbox, enabled: false });

// Paginated listing with optional cursor and limit
const { mailboxes, cursor } = await client.listMailboxes(undefined, 25);
console.log(mailboxes.length); // 1

// Get the configuration schema for a connector type
const schema = await client.getSchema('pop3');
console.log(schema.map(field => field.propertyKey)); // ["host", "port", ...]

await client.removeMailbox(id);
```

## MailStorageRestClient

```typescript
import { MailStorageRestClient } from '@twin.org/mailbox-rest-client';
import type { IBaseRestClientConfig } from '@twin.org/api-core';
import type { IStoredEmail } from '@twin.org/mailbox-models';

const config: IBaseRestClientConfig = { endpoint: 'https://api.example.com' };
const mailStorage = new MailStorageRestClient(config);

// Retrieve a single stored email by ID
const stored: IStoredEmail = await mailStorage.get('email-id-123');
console.log(stored.subject); // "Weekly report"
console.log(stored.mailboxId); // "mailbox-123"

// Query emails received since a given ISO 8601 epoch, optionally filtered by mailbox
const { emails, cursor } = await mailStorage.query(
  '2026-09-01T00:00:00Z',
  'mailbox-123',
  undefined,
  50
);
console.log(emails.length); // number of matching stored emails

await mailStorage.remove('email-id-123');
```
