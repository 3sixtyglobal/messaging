# Messaging Connector SMTP Examples

A connector for sending HTML emails through any SMTP-compatible mail server.

## SmtpMessagingEmailConnector

```typescript
import { SmtpMessagingEmailConnector } from '@3sixty/messaging-connector-smtp';

const connector = new SmtpMessagingEmailConnector({
  config: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'noreply@example.com',
    password: 'secret'
  }
});

const sent = await connector.sendCustomEmail(
  'noreply@example.com',
  ['recipient@example.com'],
  'Welcome to the platform',
  '<p>Hello! Your account has been created successfully.</p>'
);
console.log(sent); // true
```

```typescript
import { SmtpMessagingEmailConnector } from '@3sixty/messaging-connector-smtp';
import { MessagingEmailConnectorFactory } from '@3sixty/messaging-models';

const connector = new SmtpMessagingEmailConnector({
  config: {
    host: 'smtp.example.com',
    port: 587
  }
});

// Register the connector with the shared factory
MessagingEmailConnectorFactory.register(SmtpMessagingEmailConnector.NAMESPACE, () => connector);

// Send to multiple recipients
const sent = await connector.sendCustomEmail(
  'team@example.com',
  ['alice@example.com', 'bob@example.com'],
  'Team update',
  '<h1>Weekly Team Update</h1><p>See you at the standup.</p>'
);
console.log(sent); // true
```
