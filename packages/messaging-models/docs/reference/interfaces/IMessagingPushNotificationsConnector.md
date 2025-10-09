# Interface: IMessagingPushNotificationsConnector

Interface describing the push notifications messaging connector functionalities

## Extends

- `IComponent`

## Indexable

\[`key`: `string`\]: `any`

All methods are optional, so we introduce an index signature to allow
any additional properties or methods, which removes the TypeScript error where
the class has no properties in common with the type.

## Methods

### registerDevice()

> **registerDevice**(`applicationAddress`, `deviceToken`): `Promise`\<`string`\>

Registers a device to an specific app in order to send notifications to it.

#### Parameters

##### applicationAddress

`string`

The application address.

##### deviceToken

`string`

The device token.

#### Returns

`Promise`\<`string`\>

The device registered address.

***

### sendSinglePushNotification()

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
