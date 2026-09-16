# Class: SmtpMessagingEmailConnector

Class for connecting to the email messaging operations of an SMTP server.

## Implements

- `IMessagingEmailConnector`

## Constructors

### Constructor

> **new SmtpMessagingEmailConnector**(`options`): `SmtpMessagingEmailConnector`

Create a new instance of SmtpMessagingEmailConnector.

#### Parameters

##### options

[`ISmtpMessagingEmailConnectorConstructorOptions`](../interfaces/ISmtpMessagingEmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`SmtpMessagingEmailConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"smtp"`

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

Send a custom email using SMTP.

#### Parameters

##### sender

`string`

The sender email address.

##### recipients

`string`[]

An array of recipient email addresses.

##### subject

`string`

The subject of the email.

##### content

`string`

The html content of the email.

#### Returns

`Promise`\<`boolean`\>

True if the email was sent successfully.

#### Implementation of

`IMessagingEmailConnector.sendCustomEmail`
