# Messaging Service Examples

These examples show how to manage templates and send templated messages through configured connectors.

## MessagingService

Most e-mail clients ignore linked style sheets, so before sending an e-mail the service fetches each http or https style sheet linked from the template and replaces the link with a `<style>` element. Fetched style sheets are cached, and a style sheet that cannot be fetched is left as a link and logged as a warning.

```typescript
import { MessagingService } from '@3sixty/messaging-service';

const messagingService = new MessagingService({
  messagingAdminComponentType: 'messaging-admin',
  messagingEmailConnectorType: 'messaging-email',
  messagingPushNotificationConnectorType: 'messaging-push-notification',
  messagingSmsConnectorType: 'messaging-sms',
  loggingComponentType: 'logging',
  config: {
    // Replace <link rel="stylesheet" href="https://..."> in e-mail templates with <style> elements
    inlineStyleSheets: true,
    // Cache fetched style sheets for one hour
    styleSheetCacheTtlMs: 3600000
  }
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
import { MessagingAdminService } from '@3sixty/messaging-service';

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
import { TemplateEntry } from '@3sixty/messaging-service';

const templateEntry = new TemplateEntry();
templateEntry.id = 'security-code:en';
templateEntry.title = 'Security code';
templateEntry.content = 'Your code is {{code}}.';
templateEntry.dateCreated = new Date().toISOString();

console.log(templateEntry.id); // security-code:en
```
