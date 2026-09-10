# Interface: IEmailProtocolConnector\<TState, TAuthState\>

Interface describing an email protocol connector that handles message retrieval.

## Extends

- `IComponent`

## Type Parameters

### TState

`TState` = `unknown`

### TAuthState

`TAuthState` *extends* [`IEmailProtocolConnectorAuthState`](IEmailProtocolConnectorAuthState.md) = [`IEmailProtocolConnectorAuthState`](IEmailProtocolConnectorAuthState.md)

## Methods

### retrieve() {#retrieve}

> **retrieve**(`instanceId`, `state`, `authCallback`, `retrievalCallback`, `options`): `Promise`\<`void`\>

Start the internal polling loop for the given instance.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being polled.

##### state

`TState`

The current connector state for the instance.

##### authCallback

[`IEmailProtocolConnectorAuthCallback`](../type-aliases/IEmailProtocolConnectorAuthCallback.md)\<`TAuthState`\>

Callback invoked when authentication fails during a poll cycle.

##### retrievalCallback

[`IEmailProtocolConnectorRetrievalCallback`](../type-aliases/IEmailProtocolConnectorRetrievalCallback.md)

Callback invoked with retrieved messages after each poll cycle.

##### options

[`IEmailProtocolConnectorOptions`](IEmailProtocolConnectorOptions.md)

Options supplied by the owning component.

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

***

### initiateAuth()? {#initiateauth}

> `optional` **initiateAuth**(`instanceId`, `state`, `options`): `Promise`\<`TAuthState` \| `undefined`\>

Start an authentication flow for a mailbox before it is polled for the first time.
Only implemented by connectors whose credentials are issued by an external flow, such as
an OAuth consent redirect, so the caller can hand the flow straight to the operator who
created the mailbox rather than waiting for the first poll to report it.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being authenticated.

##### state

`TState`

The current connector state for the instance, which may already hold credentials.

##### options

[`IEmailProtocolConnectorOptions`](IEmailProtocolConnectorOptions.md)

Options supplied by the owning component, carrying the callback URI the flow
must return to and the state which correlates it back to the mailbox.

#### Returns

`Promise`\<`TAuthState` \| `undefined`\>

The auth state carrying the URL to open for the user, or undefined when the
mailbox is already able to authenticate itself.

***

### completeAuth()? {#completeauth}

> `optional` **completeAuth**(`instanceId`, `authPayload`, `options`): `Promise`\<`void`\>

Complete an authentication flow the connector reported through its auth callback.
Only implemented by connectors whose credentials are issued by an external flow, such as
an OAuth consent redirect. The outcome is reported back through the auth callback the
connector was given by retrieve, so nothing is returned here.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being authenticated.

##### authPayload

`unknown`

The protocol-specific data handed to the redirect, such as an OAuth code.

##### options

[`IEmailProtocolConnectorOptions`](IEmailProtocolConnectorOptions.md)

Options supplied by the owning component, carrying the same callback URI the
flow was started with.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the flow has been completed.
