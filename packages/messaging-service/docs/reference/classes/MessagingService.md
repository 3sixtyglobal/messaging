# Class: MessagingService

Service for dispatching messages via configured email, push notification, and SMS connectors.

## Implements

- `IMessagingComponent`

## Constructors

### Constructor

> **new MessagingService**(`options?`): `MessagingService`

Create a new instance of MessagingService.

#### Parameters

##### options?

[`IMessagingServiceConstructorOptions`](../interfaces/IMessagingServiceConstructorOptions.md)

The options for the service.

#### Returns

`MessagingService`

## Properties

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

`IMessagingComponent.className`

***

### sendCustomEmail() {#sendcustomemail}

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

True if the email was sent successfully.

#### Implementation of

`IMessagingComponent.sendCustomEmail`

***

### registerDevice() {#registerdevice}

> **registerDevice**(`applicationId`, `deviceToken`): `Promise`\<`string`\>

Registers a device to a specific application in order to send notifications to it.

#### Parameters

##### applicationId

`string`

The application address.

##### deviceToken

`string`

The device token.

#### Returns

`Promise`\<`string`\>

The address assigned to the registered device.

#### Implementation of

`IMessagingComponent.registerDevice`

***

### sendSinglePushNotification() {#sendsinglepushnotification}

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

True if the notification was sent successfully.

#### Implementation of

`IMessagingComponent.sendSinglePushNotification`

***

### sendSMS() {#sendsms}

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

True if the SMS was sent successfully.

#### Implementation of

`IMessagingComponent.sendSMS`
