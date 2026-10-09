# Messaging Models Examples

Use these examples to register connector implementations and resolve them through the shared factories.

## MessagingPushNotificationsConnectorFactory

```typescript
import {
  MessagingPushNotificationsConnectorFactory,
  type IMessagingPushNotificationsConnector
} from '@3sixty/messaging-models';

MessagingPushNotificationsConnectorFactory.register(
  'in-memory-push',
  () =>
    ({
      registerDevice: async (applicationId: string, deviceToken: string) =>
        `${applicationId}:${deviceToken}`,
      sendSinglePushNotification: async () => true
    }) as IMessagingPushNotificationsConnector
);

const pushConnector = MessagingPushNotificationsConnectorFactory.get('in-memory-push');
const deviceAddress = await pushConnector.registerDevice('orders-app', 'token-001');
console.log(deviceAddress); // orders-app:token-001
```

## MessagingEmailConnectorFactory

```typescript
import {
  MessagingEmailConnectorFactory,
  type IMessagingEmailConnector
} from '@3sixty/messaging-models';

MessagingEmailConnectorFactory.register(
  'in-memory-email',
  () =>
    ({
      sendCustomEmail: async () => true
    }) as IMessagingEmailConnector
);

const emailConnector = MessagingEmailConnectorFactory.get('in-memory-email');
const emailQueued = await emailConnector.sendCustomEmail(
  'service@example.org',
  ['recipient@example.org'],
  'Welcome',
  '<p>Thanks for signing up.</p>'
);
console.log(emailQueued); // true
```

## MessagingSmsConnectorFactory

```typescript
import {
  MessagingSmsConnectorFactory,
  type IMessagingSmsConnector
} from '@3sixty/messaging-models';

MessagingSmsConnectorFactory.register(
  'in-memory-sms',
  () =>
    ({
      sendSMS: async () => true
    }) as IMessagingSmsConnector
);

const smsConnector = MessagingSmsConnectorFactory.get('in-memory-sms');
const smsQueued = await smsConnector.sendSMS('+441234567890', 'Your one-time code is 482931');
console.log(smsQueued); // true
```
