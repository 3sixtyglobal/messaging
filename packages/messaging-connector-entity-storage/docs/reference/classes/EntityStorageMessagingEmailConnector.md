# Class: EntityStorageMessagingEmailConnector

Class for connecting to the email messaging operations of the Entity Storage.

## Implements

- `IMessagingEmailConnector`

## Constructors

### Constructor

> **new EntityStorageMessagingEmailConnector**(`options?`): `EntityStorageMessagingEmailConnector`

Create a new instance of EntityStorageMessagingEmailConnector.

#### Parameters

##### options?

[`IEntityStorageMessagingEmailConnectorConstructorOptions`](../interfaces/IEntityStorageMessagingEmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageMessagingEmailConnector`

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

`IMessagingEmailConnector.className`

***

### sendCustomEmail() {#sendcustomemail}

> **sendCustomEmail**(`sender`, `recipients`, `subject`, `content`): `Promise`\<`boolean`\>

Store a custom email using Entity Storage.

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
