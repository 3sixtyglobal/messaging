# Messaging Service Examples

These examples show how to manage templates and send templated messages through configured connectors.

## MessagingService

```typescript
import { MessagingService } from '@twin.org/messaging-service';

const messagingService = new MessagingService({
  messagingAdminComponentType: 'messaging-admin',
  messagingEmailConnectorType: 'messaging-email',
  messagingPushNotificationConnectorType: 'messaging-push-notification',
  messagingSmsConnectorType: 'messaging-sms'
});

console.log(messagingService.className()); // MessagingService

const emailSent = await messagingService.sendCustomEmail(
  'service@example.org',
  ['alice@example.org', 'bob@example.org'],
  'welcome-email',
  {
    firstName: 'Alice',
    organisation: 'Twin Foundation'
  },
  'en'
);
console.log(emailSent); // true

const deviceAddress = await messagingService.registerDevice('orders-app', 'device-token-001');
console.log(deviceAddress); // orders-app:device-token-001

const pushSent = await messagingService.sendSinglePushNotification(
  deviceAddress,
  'delivery-update',
  {
    orderNumber: 'ORD-4829',
    status: 'Out for delivery'
  },
  'en'
);
console.log(pushSent); // true

const smsSent = await messagingService.sendSMS(
  '+441234567890',
  'security-code',
  {
    code: '482931'
  },
  'en'
);
console.log(smsSent); // true
```

## MessagingAdminService

```typescript
import { MessagingAdminService } from '@twin.org/messaging-service';

const adminService = new MessagingAdminService({
  config: {
    defaultLocale: 'en'
  },
  templateEntryStorageConnectorType: 'template-entry'
});

console.log(adminService.className()); // MessagingAdminService

await adminService.setTemplate(
  'welcome-email',
  'en',
  'Welcome {{firstName}}',
  'Hi {{firstName}}, thanks for joining {{organisation}}.'
);

const template = await adminService.getTemplate('welcome-email', 'en');
console.log(template.title); // Welcome {{firstName}}

await adminService.removeTemplate('welcome-email', 'en');
```

## TemplateEntry

```typescript
import { TemplateEntry } from '@twin.org/messaging-service';

const templateEntry = new TemplateEntry();
templateEntry.id = 'security-code:en';
templateEntry.title = 'Security code';
templateEntry.content = 'Your code is {{code}}.';
templateEntry.dateCreated = new Date().toISOString();

console.log(templateEntry.id); // security-code:en
```
