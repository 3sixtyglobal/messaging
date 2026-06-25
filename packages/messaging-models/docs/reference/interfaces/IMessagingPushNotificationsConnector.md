# Interface: IMessagingPushNotificationsConnector

Interface describing the push notifications messaging connector functionalities.

## Extends

- `IComponent`

## Methods

### registerDevice() {#registerdevice}

> **registerDevice**(`applicationAddress`, `deviceToken`): `Promise`\<`string`\>

Registers a device to a specific application in order to send notifications to it.

#### Parameters

##### applicationAddress

`string`

The application address.

##### deviceToken

`string`

The device token.

#### Returns

`Promise`\<`string`\>

The address assigned to the registered device.

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

True if the notification was sent successfully.
