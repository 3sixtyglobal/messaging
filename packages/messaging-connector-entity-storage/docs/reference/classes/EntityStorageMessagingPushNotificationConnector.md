# Class: EntityStorageMessagingPushNotificationConnector

Class for connecting to the push notifications messaging operations of the Entity Storage.

## Implements

- `IMessagingPushNotificationsConnector`

## Constructors

### Constructor

> **new EntityStorageMessagingPushNotificationConnector**(`options?`): `EntityStorageMessagingPushNotificationConnector`

Create a new instance of EntityStorageMessagingPushNotificationConnector.

#### Parameters

##### options?

[`IEntityStorageMessagingPushNotificationConnectorConstructorOptions`](../interfaces/IEntityStorageMessagingPushNotificationConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageMessagingPushNotificationConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"entity-storage"`

The namespace for the connector.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IMessagingPushNotificationsConnector.className`

***

### registerDevice() {#registerdevice}

> **registerDevice**(`applicationId`, `deviceToken`): `Promise`\<`string`\>

Registers a device to an specific app in order to send notifications to it.

#### Parameters

##### applicationId

`string`

The application address.

##### deviceToken

`string`

The device token.

#### Returns

`Promise`\<`string`\>

If the device was registered successfully.

#### Implementation of

`IMessagingPushNotificationsConnector.registerDevice`

***

### sendSinglePushNotification() {#sendsinglepushnotification}

> **sendSinglePushNotification**(`deviceAddress`, `title`, `message`): `Promise`\<`boolean`\>

Send a push notification to a device.

#### Parameters

##### deviceAddress

`string`

The address of the device.

##### title

`string`

The title of the notification.

##### message

`string`

The message to send.

#### Returns

`Promise`\<`boolean`\>

If the notification was sent successfully.

#### Implementation of

`IMessagingPushNotificationsConnector.sendSinglePushNotification`
