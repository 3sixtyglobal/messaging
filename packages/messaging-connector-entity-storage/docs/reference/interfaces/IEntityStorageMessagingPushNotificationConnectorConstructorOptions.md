# Interface: IEntityStorageMessagingPushNotificationConnectorConstructorOptions

Options for the entity storage messaging push notification connector.

## Properties

### loggingComponentType?

> `optional` **loggingComponentType**: `string`

The type of logging component to use, defaults to no logging.

***

### messagingDeviceEntryStorageConnectorType?

> `optional` **messagingDeviceEntryStorageConnectorType**: `string`

The type of entity storage connector to use for the push notifications entries.

#### Default

```ts
push-notification-device-entry
```

***

### messagingMessageEntryStorageConnectorType?

> `optional` **messagingMessageEntryStorageConnectorType**: `string`

The type of entity storage connector to use for the push notifications entries.

#### Default

```ts
push-notification-message-entry
```
