# Class: MessagingService

Service for performing email messaging operations to a connector.

## Implements

- `IMessagingComponent`

## Constructors

### Constructor

> **new MessagingService**(`options?`): `MessagingService`

Create a new instance of MessagingService.

#### Parameters

##### options?

[`IMessagingServiceConstructorOptions`](../interfaces/IMessagingServiceConstructorOptions.md)

The options for the connector.

#### Returns

`MessagingService`

## Properties

### CLASS\_NAME

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className()

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IMessagingComponent.className`

***

### sendCustomEmail()

> **sendCustomEmail**(`sender`, `recipients`, `templateId`, `data`, `locale`): `Promise`\<`boolean`\>

Send a custom email.

#### Parameters

##### sender

`string`

The sender email address.

##### recipients

`string`[]

An array of recipients email addresses.

##### templateId

`string`

The id of the email template.

##### data

The data to populate the email template.

##### locale

`string`

The locale of the email template.

#### Returns

`Promise`\<`boolean`\>

If the email was sent successfully.

#### Implementation of

`IMessagingComponent.sendCustomEmail`

***

### registerDevice()

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

`IMessagingComponent.registerDevice`

***

### sendSinglePushNotification()

> **sendSinglePushNotification**(`deviceAddress`, `templateId`, `data`, `locale`): `Promise`\<`boolean`\>

Send a push notification to a device.

#### Parameters

##### deviceAddress

`string`

The address of the device.

##### templateId

`string`

The id of the push notification template.

##### data

The data to populate the push notification template.

##### locale

`string`

The locale of the push notification template.

#### Returns

`Promise`\<`boolean`\>

If the notification was sent successfully.

#### Implementation of

`IMessagingComponent.sendSinglePushNotification`

***

### sendSMS()

> **sendSMS**(`phoneNumber`, `templateId`, `data`, `locale`): `Promise`\<`boolean`\>

Send a SMS message to a phone number.

#### Parameters

##### phoneNumber

`string`

The recipient phone number.

##### templateId

`string`

The id of the SMS template.

##### data

The data to populate the SMS template.

##### locale

`string`

The locale of the SMS template.

#### Returns

`Promise`\<`boolean`\>

If the SMS was sent successfully.

#### Implementation of

`IMessagingComponent.sendSMS`
