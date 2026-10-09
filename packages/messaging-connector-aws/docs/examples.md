# Messaging Connector AWS Examples

Use these examples to initialise connectors, run the main messaging flows, and verify behaviour in local development.

## AwsMessagingPushNotificationConnector

```typescript
import { AwsMessagingPushNotificationConnector } from '@3sixty/messaging-connector-aws';

const pushConnector = new AwsMessagingPushNotificationConnector({
  config: {
    region: 'eu-central-1',
    authMode: 'credentials',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    applicationsSettings: [
      {
        applicationId: 'orders-app',
        pushNotificationsPlatformType: 'GCM',
        pushNotificationsPlatformCredentials: 'firebase-server-key'
      }
    ]
  }
});

console.log(pushConnector.className()); // AwsMessagingPushNotificationConnector

await pushConnector.start();
const deviceAddress = await pushConnector.registerDevice('orders-app', 'device-token-001');
console.log(deviceAddress); // arn:aws:sns:eu-central-1:123456789012:endpoint/GCM/orders-app/device-token-001

const wasSent = await pushConnector.sendSinglePushNotification(
  deviceAddress,
  'Order updated',
  'Your parcel is now out for delivery'
);
console.log(wasSent); // true
```

## AwsMessagingEmailConnector

```typescript
import { AwsMessagingEmailConnector } from '@3sixty/messaging-connector-aws';

const emailConnector = new AwsMessagingEmailConnector({
  config: {
    region: 'eu-central-1',
    authMode: 'credentials',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key'
  }
});

console.log(emailConnector.className()); // AwsMessagingEmailConnector

const customEmailSent = await emailConnector.sendCustomEmail(
  'service@example.org',
  ['alice@example.org', 'bob@example.org'],
  'Scheduled maintenance',
  '<p>Maintenance starts at 22:00 UTC.</p>'
);
console.log(customEmailSent); // true

await emailConnector.verifyEmailAddress('service@example.org');
```

## AwsMessagingSmsConnector

```typescript
import { AwsMessagingSmsConnector } from '@3sixty/messaging-connector-aws';

const smsConnector = new AwsMessagingSmsConnector({
  config: {
    region: 'eu-central-1',
    authMode: 'credentials',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key'
  }
});

console.log(smsConnector.className()); // AwsMessagingSmsConnector

const smsSent = await smsConnector.sendSMS('+441234567890', 'Your verification code is 284931');
console.log(smsSent); // true
```
