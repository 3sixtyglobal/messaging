# Interface: IEmailProtocolConnector\<TState\>

Interface describing an email protocol connector that handles message retrieval.

## Extends

- `IComponent`

## Type Parameters

### TState

`TState` = `unknown`

## Methods

### retrieve() {#retrieve}

> **retrieve**(`instanceId`, `state`, `authCallback`, `retrievalCallback`): `Promise`\<`void`\>

Start the internal polling loop for the given instance.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being polled.

##### state

`TState`

The current connector state for the instance.

##### authCallback

[`IEmailProtocolConnectorAuthCallback`](../type-aliases/IEmailProtocolConnectorAuthCallback.md)

Callback invoked when authentication fails during a poll cycle.

##### retrievalCallback

[`IEmailProtocolConnectorRetrievalCallback`](../type-aliases/IEmailProtocolConnectorRetrievalCallback.md)

Callback invoked with retrieved messages after each poll cycle.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been started.

***

### retrieveStop() {#retrievestop}

> **retrieveStop**(): `Promise`\<`void`\>

Stop the internal polling loop.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been stopped.
