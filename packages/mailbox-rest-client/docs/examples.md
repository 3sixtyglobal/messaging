# Mailbox REST Client Examples

REST clients for interacting with the mailbox management and email storage endpoints.

## MailboxRestClient

```typescript
import { MailboxRestClient } from '@3sixty/mailbox-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-core';
import type { IMailbox } from '@3sixty/mailbox-models';

const config: IBaseRestClientConfig = { endpoint: 'https://api.example.com' };
const client = new MailboxRestClient(config);

// Create a mailbox and retrieve its generated ID, along with the URL to open for the user
// when the mailbox must be authenticated before it can be polled
const { id, authUrl } = await client.createMailbox({
  name: 'Work Inbox',
  connectorType: 'imap',
  config: { host: 'imap.example.com', username: 'user@example.com' },
  enabled: true
});
console.log(id); // "019547d0-..."
console.log(authUrl); // undefined, IMAP authenticates with the configured credentials

const mailbox: IMailbox = await client.getMailbox(id);
console.log(mailbox.name); // "Work Inbox"
console.log(mailbox.enabled); // true

// Update the mailbox; an update replaces the credentials, so a connector which needs an
// external flow returns the URL to open the same way creating one does
const updated = await client.updateMailbox({ ...mailbox, enabled: false });
console.log(updated.authUrl); // undefined, IMAP authenticates with the configured credentials

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
import { MailStorageRestClient } from '@3sixty/mailbox-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-core';
import type { IStoredEmail } from '@3sixty/mailbox-models';

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
