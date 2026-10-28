# Interface: IMessagingServiceConstructorOptions

Options for the messaging service.

## Properties

### messagingEmailConnectorType? {#messagingemailconnectortype}

> `optional` **messagingEmailConnectorType?**: `string`

The type of the email messaging connector to use, defaults to not configured.

***

### messagingPushNotificationConnectorType? {#messagingpushnotificationconnectortype}

> `optional` **messagingPushNotificationConnectorType?**: `string`

The type of the push notifications messaging connector to use, defaults to not configured.

***

### messagingSmsConnectorType? {#messagingsmsconnectortype}

> `optional` **messagingSmsConnectorType?**: `string`

The type of the sms messaging connector to use, defaults to not configured.

***

### messagingAdminComponentType? {#messagingadmincomponenttype}

> `optional` **messagingAdminComponentType?**: `string`

The type of the messaging admin component to use.

#### Default

```ts
messaging-admin
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The type of the logging component to use, defaults to no logging.

***

### config? {#config}

> `optional` **config?**: [`IMessagingServiceConfig`](IMessagingServiceConfig.md)

The configuration for the messaging service.
