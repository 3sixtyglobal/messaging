# Class: OutlookEmailConnector

Outlook email protocol connector. Monitors a mailbox for new messages using Microsoft Graph.

## Implements

- `IEmailProtocolConnector`\<[`IOutlookEmailConnectorState`](../interfaces/IOutlookEmailConnectorState.md)\>

## Constructors

### Constructor

> **new OutlookEmailConnector**(`options`): `OutlookEmailConnector`

Create a new instance of OutlookEmailConnector.

#### Parameters

##### options

[`IOutlookEmailConnectorConstructorOptions`](../interfaces/IOutlookEmailConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`OutlookEmailConnector`

#### Throws

GeneralError if neither a client secret nor a client certificate is supplied.

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

The class name.

***

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"outlook"`

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

[`IOutlookEmailConnectorState`](../interfaces/IOutlookEmailConnectorState.md)

The current connector state for the instance.

##### authCallback

`IEmailProtocolConnectorAuthCallback`

Callback invoked when authentication fails during a poll cycle.

##### retrievalCallback

`IEmailProtocolConnectorRetrievalCallback`

Callback invoked with retrieved messages after each poll cycle.

##### options

`IEmailProtocolConnectorOptions`

Options supplied by the owning component, carrying the consent callback URI.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been started.

#### Implementation of

`IEmailProtocolConnector.retrieve`

***

### initiateAuth() {#initiateauth}

> **initiateAuth**(`instanceId`, `state`, `options`): `Promise`\<`IEmailProtocolConnectorAuthState` \| `undefined`\>

Start the consent flow for a mailbox which has no credentials yet.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being authenticated.

##### state

[`IOutlookEmailConnectorState`](../interfaces/IOutlookEmailConnectorState.md)

The current connector state for the instance.

##### options

`IEmailProtocolConnectorOptions`

Options supplied by the owning component, carrying the consent callback URI
and the state which correlates the consent response back to the mailbox.

#### Returns

`Promise`\<`IEmailProtocolConnectorAuthState` \| `undefined`\>

The auth state carrying the consent URL to open, or undefined when the mailbox can
already authenticate itself from application permissions or a token cache in its state.

#### Implementation of

`IEmailProtocolConnector.initiateAuth`

***

### completeAuth() {#completeauth}

> **completeAuth**(`instanceId`, `authPayload`, `options`): `Promise`\<`void`\>

Complete the consent flow with the authorisation code handed to the redirect URI.
The issued credentials are applied to this connector instance so the next poll uses them,
and the token cache holding the refresh token is placed in the state reported through the
auth callback given by retrieve, so the owning component vaults it and lifts the
authentication halt.

#### Parameters

##### instanceId

`string`

The identifier of the mailbox instance being authenticated.

##### authPayload

`unknown`

The redirect query, carrying the authorisation code as its code property.

##### options

`IEmailProtocolConnectorOptions`

Options supplied by the owning component, carrying the consent callback URI.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the flow has been completed.

#### Throws

GeneralError if the authorisation code could not be exchanged for tokens.

#### Implementation of

`IEmailProtocolConnector.completeAuth`

***

### retrieveStop() {#retrievestop}

> **retrieveStop**(): `Promise`\<`void`\>

Stop the polling loop for this connector.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the polling loop has been stopped.

#### Implementation of

`IEmailProtocolConnector.retrieveStop`
