# Class: AwsMessagingEmailConnector

Class for connecting to the email messaging operations of the AWS services.

## Implements

- `IMessagingEmailConnector`

## Constructors

### Constructor

> **new AwsMessagingEmailConnector**(`options`): `AwsMessagingEmailConnector`

Create a new instance of AwsMessagingEmailConnector.

#### Parameters

##### options

[`IAwsMessagingEmailConnectorConstructorOptions`](../interfaces/IAwsMessagingEmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`AwsMessagingEmailConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"aws"`

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

`IMessagingEmailConnector.className`

***

### sendCustomEmail() {#sendcustomemail}

> **sendCustomEmail**(`sender`, `recipients`, `subject`, `content`): `Promise`\<`boolean`\>

Send a custom email using AWS SES.

#### Parameters

##### sender

`string`

The sender email address.

##### recipients

`string`[]

An array of recipients email addresses.

##### subject

`string`

The subject of the email.

##### content

`string`

The html content of the email.

#### Returns

`Promise`\<`boolean`\>

True if the email was send successfully, otherwise undefined.

#### Implementation of

`IMessagingEmailConnector.sendCustomEmail`

***

### verifyEmailAddress() {#verifyemailaddress}

> **verifyEmailAddress**(`emailAddress`): `Promise`\<`void`\>

Verify an email address using AWS SES.

#### Parameters

##### emailAddress

`string`

The email address to verify.

#### Returns

`Promise`\<`void`\>
