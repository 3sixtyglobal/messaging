# Mailbox Service Examples

Service implementations for mailbox management and email storage, plus REST route registration.

## MailboxService

```typescript
import { MailboxService, initSchema } from '@twin.org/mailbox-service';
import type { IMailbox } from '@twin.org/mailbox-models';

// Register entity schemas before constructing services
initSchema();

const service = new MailboxService({
  mailboxStorageConnectorType: 'mailbox-entry',
  vaultConnectorType: 'vault',
  mailStorageComponentType: 'mail-storage'
});

// Start polling all enabled mailboxes
await service.start();
```

```typescript
import { MailboxService } from '@twin.org/mailbox-service';
import type { IMailbox } from '@twin.org/mailbox-models';

const service = new MailboxService();

// Create a mailbox; returns the generated ID, and the URL to open for the user when the
// connector needs an external flow completed before the mailbox can be polled
const { id, authUrl } = await service.createMailbox({
  name: 'Work Inbox',
  connectorType: 'imap',
  config: {
    host: 'imap.example.com',
    username: 'user@example.com',
    password: 'secret'
  },
  enabled: true
});
console.log(id); // "019547d0-..."
console.log(authUrl); // undefined, IMAP authenticates with the configured credentials

const mailbox: IMailbox = await service.getMailbox(id);
console.log(mailbox.name); // "Work Inbox"
console.log(mailbox.enabled); // true

// Update the mailbox; an update replaces the credentials, so a connector which needs an
// external flow returns the URL to open the same way creating one does
const updated = await service.updateMailbox({ ...mailbox, name: 'Primary Inbox' });
console.log(updated.authUrl); // undefined, IMAP authenticates with the configured credentials

// Paginated listing
const { mailboxes, cursor } = await service.listMailboxes(undefined, 20);
console.log(mailboxes.length); // 1

// Get the configuration schema for a connector type, throws NotFoundError if none is registered
const schema = await service.getSchema('pop3');
console.log(schema.map(field => field.propertyKey)); // ["host", "port", ...]

// Remove the mailbox and stop its connector
await service.removeMailbox(id);

// Stop all active connectors
await service.stop();
```

## MailStorageService

```typescript
import { MailStorageService } from '@twin.org/mailbox-service';
import type { IEmail, IStoredEmail } from '@twin.org/mailbox-models';

const storage = new MailStorageService({
  emailStorageConnectorType: 'email-entry'
});

const email: IEmail = {
  subject: 'Weekly report',
  from: { name: 'Alice', address: 'alice@example.com' },
  to: [{ address: 'bob@example.com' }],
  textContent: 'Please find the report attached.',
  date: '2026-09-01T08:00:00Z'
};

const emailId = await storage.store('mailbox-123', email);
console.log(emailId); // "019547d0-..."

const stored: IStoredEmail = await storage.get(emailId);
console.log(stored.mailboxId); // "mailbox-123"
console.log(stored.subject); // "Weekly report"
console.log(stored.receivedAt); // ISO 8601 timestamp set at store time

// Query emails received since a given epoch, optionally filtered by mailbox
const { emails, cursor } = await storage.query(
  '2026-09-01T00:00:00Z',
  'mailbox-123',
  undefined,
  50
);
console.log(emails.length); // 1

await storage.remove(emailId);
```

## restEntryPoints

```typescript
import { restEntryPoints } from '@twin.org/mailbox-service';

// Mount mailbox and mail-storage REST routes in your API server
for (const entry of restEntryPoints) {
  console.log(entry.name); // "mailbox" then "mail-storage"
  // pass entry.generateRoutes to your REST framework route registration
}
```
