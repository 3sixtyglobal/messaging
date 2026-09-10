# Class: ImapEmailConnector

IMAP email protocol connector. Polls configured folders for new messages using imapflow.

## Implements

- `IEmailProtocolConnector`\<[`IImapEmailConnectorState`](../interfaces/IImapEmailConnectorState.md)\>

## Constructors

### Constructor

> **new ImapEmailConnector**(`options`): `ImapEmailConnector`

Create a new instance of ImapEmailConnector.

#### Parameters

##### options

[`IImapEmailConnectorConstructorOptions`](../interfaces/IImapEmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`ImapEmailConnector`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

The class name.

***

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"imap"`

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

> **retrieve**(`instanceId`, `state`, `authCallback`, `retrievalCallback`, `options`): `Promise`\<`void`\>

Start the internal polling loop for the given instance.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being polled.

##### state

[`IImapEmailConnectorState`](../interfaces/IImapEmailConnectorState.md)

The current connector state for the instance.

##### authCallback

`IEmailProtocolConnectorAuthCallback`

Callback invoked when authentication fails during a poll cycle.

##### retrievalCallback

`IEmailProtocolConnectorRetrievalCallback`

Callback invoked with retrieved messages after each poll cycle.

##### options

`IEmailProtocolConnectorOptions`

Options supplied by the owning component, unused by this protocol which
authenticates with the stored credentials rather than an external flow.

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
