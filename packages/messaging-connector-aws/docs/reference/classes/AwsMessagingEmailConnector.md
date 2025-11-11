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

### NAMESPACE

> `readonly` `static` **NAMESPACE**: `string` = `"aws"`

The namespace for the connector.

***

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

`IMessagingEmailConnector.className`

***

### sendCustomEmail()

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
