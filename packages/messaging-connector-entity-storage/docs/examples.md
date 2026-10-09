# Messaging Connector Entity Storage Examples

These examples show how to queue message work in entity storage and inspect stored entries during processing.

## EntityStorageMessagingPushNotificationConnector

```typescript
import { EntityStorageMessagingPushNotificationConnector } from '@3sixty/messaging-connector-entity-storage';

const pushConnector = new EntityStorageMessagingPushNotificationConnector();

console.log(pushConnector.className()); // EntityStorageMessagingPushNotificationConnector
const deviceRecordId = await pushConnector.registerDevice('orders-app', 'device-token-001');
console.log(deviceRecordId); // 3f0a8e8e7d58b2f1a1d2f3c4b5e6a7c8d9e0f112131415161718191a1b1c1d1e

const queued = await pushConnector.sendSinglePushNotification(
  'device-record-001',
  'Order dispatched',
  'Your parcel has left the warehouse'
);
console.log(queued); // true
```

## EntityStorageMessagingEmailConnector

```typescript
import { EntityStorageMessagingEmailConnector } from '@3sixty/messaging-connector-entity-storage';

const emailConnector = new EntityStorageMessagingEmailConnector();

console.log(emailConnector.className()); // EntityStorageMessagingEmailConnector

const queued = await emailConnector.sendCustomEmail(
  'service@example.org',
  ['recipient@example.org'],
  'Welcome',
  '<p>Thanks for signing up.</p>'
);
console.log(queued); // true
```

## EntityStorageMessagingSmsConnector

```typescript
import { EntityStorageMessagingSmsConnector } from '@3sixty/messaging-connector-entity-storage';

const smsConnector = new EntityStorageMessagingSmsConnector();

console.log(smsConnector.className()); // EntityStorageMessagingSmsConnector

const queued = await smsConnector.sendSMS(
  '+441234567890',
  'Your appointment is confirmed for 10:30'
);
console.log(queued); // true
```

## PushNotificationMessageEntry

```typescript
import { PushNotificationMessageEntry } from '@3sixty/messaging-connector-entity-storage';

const messageEntry = new PushNotificationMessageEntry();
messageEntry.id = 'push-message-001';
messageEntry.deviceAddress = 'device-record-001';
messageEntry.title = 'Order dispatched';
messageEntry.message = 'Your parcel has left the warehouse';
messageEntry.ts = Date.now();
messageEntry.status = 'pending';

console.log(messageEntry.status); // pending
```

## PushNotificationDeviceEntry

```typescript
import { PushNotificationDeviceEntry } from '@3sixty/messaging-connector-entity-storage';

const deviceEntry = new PushNotificationDeviceEntry();
deviceEntry.id = 'push-device-001';
deviceEntry.applicationId = 'orders-app';
deviceEntry.deviceToken = 'device-token-001';
deviceEntry.ts = Date.now();
deviceEntry.status = 'pending';

console.log(deviceEntry.applicationId); // orders-app
```

## EmailEntry

```typescript
import { EmailEntry } from '@3sixty/messaging-connector-entity-storage';

const emailEntry = new EmailEntry();
emailEntry.id = 'email-001';
emailEntry.sender = 'service@example.org';
emailEntry.recipients = ['recipient@example.org'];
emailEntry.ts = Date.now();
emailEntry.subject = 'Welcome';
emailEntry.message = '<p>Thanks for signing up.</p>';
emailEntry.status = 'pending';

console.log(emailEntry.recipients.length); // 1
```

## SmsEntry

```typescript
import { SmsEntry } from '@3sixty/messaging-connector-entity-storage';

const smsEntry = new SmsEntry();
smsEntry.id = 'sms-001';
smsEntry.phoneNumber = '+441234567890';
smsEntry.ts = Date.now();
smsEntry.message = 'Your appointment is confirmed for 10:30';
smsEntry.status = 'sent';

console.log(smsEntry.status); // sent
```
