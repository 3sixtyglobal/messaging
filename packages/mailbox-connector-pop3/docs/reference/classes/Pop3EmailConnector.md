# Class: Pop3EmailConnector

POP3 email protocol connector. Polls for new messages using node-pop3 and postal-mime.

## Implements

- `IEmailProtocolConnector`\<[`IPop3EmailConnectorState`](../interfaces/IPop3EmailConnectorState.md)\>

## Constructors

### Constructor

> **new Pop3EmailConnector**(`options`): `Pop3EmailConnector`

Create a new instance of Pop3EmailConnector.

#### Parameters

##### options

[`IPop3EmailConnectorConstructorOptions`](../interfaces/IPop3EmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`Pop3EmailConnector`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

The class name.

***

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"pop3"`

The protocol namespace identifier.

## Methods

### className() {#classname}

> **className**(): `string`

Get the class name.

#### Returns

`string`

The class name.

#### Implementation of

`IEmailProtocolConnector.className`

***

### retrieve() {#retrieve}

> **retrieve**(`instanceId`, `state`, `authCallback`, `retrievalCallback`): `Promise`\<`void`\>

Start the internal polling loop for the given instance.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being polled.

##### state

[`IPop3EmailConnectorState`](../interfaces/IPop3EmailConnectorState.md)

The current connector state for the instance.

##### authCallback

`IEmailProtocolConnectorAuthCallback`

Callback invoked when authentication fails during a poll cycle.

##### retrievalCallback

`IEmailProtocolConnectorRetrievalCallback`

Callback invoked with retrieved messages after each poll cycle.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been started.

#### Implementation of

`IEmailProtocolConnector.retrieve`

***

### retrieveStop() {#retrievestop}

> **retrieveStop**(): `Promise`\<`void`\>

Stop the polling loop for this connector.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been stopped.

#### Implementation of

`IEmailProtocolConnector.retrieveStop`
