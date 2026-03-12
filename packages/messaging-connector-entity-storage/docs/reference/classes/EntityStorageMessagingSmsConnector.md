# Class: EntityStorageMessagingSmsConnector

Class for connecting to the SMS messaging operations of the Entity Storage.

## Implements

- `IMessagingSmsConnector`

## Constructors

### Constructor

> **new EntityStorageMessagingSmsConnector**(`options?`): `EntityStorageMessagingSmsConnector`

Create a new instance of EntityStorageMessagingSmsConnector.

#### Parameters

##### options?

[`IEntityStorageMessagingSmsConnectorConstructorOptions`](../interfaces/IEntityStorageMessagingSmsConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageMessagingSmsConnector`

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

`IMessagingSmsConnector.className`

***

### sendSMS() {#sendsms}

> **sendSMS**(`phoneNumber`, `message`): `Promise`\<`boolean`\>

Send a SMS message to a phone number.

#### Parameters

##### phoneNumber

`string`

The recipient phone number.

##### message

`string`

The message to send.

#### Returns

`Promise`\<`boolean`\>

If the SMS was sent successfully.

#### Implementation of

`IMessagingSmsConnector.sendSMS`
