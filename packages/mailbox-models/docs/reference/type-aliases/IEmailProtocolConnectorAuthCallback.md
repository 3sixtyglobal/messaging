# Type Alias: IEmailProtocolConnectorAuthCallback\<TAuthState\>

> **IEmailProtocolConnectorAuthCallback**\<`TAuthState`\> = (`mailboxId`, `updatedState`, `requiresAuth`, `authState?`, `authError?`) => `Promise`\<`void`\>

Callback invoked by a protocol connector to report the outcome of an authentication attempt.

## Type Parameters

### TAuthState

`TAuthState` *extends* [`IEmailProtocolConnectorAuthState`](../interfaces/IEmailProtocolConnectorAuthState.md) = [`IEmailProtocolConnectorAuthState`](../interfaces/IEmailProtocolConnectorAuthState.md)

## Parameters

### mailboxId

`string`

The identifier of the mailbox this authentication attempt belongs to.

### updatedState

`unknown` \| `undefined`

Optional connector state to persist on the mailbox entity, carrying any
credentials the flow issued in the properties the connector state schema marks as secure.

### requiresAuth

`boolean`

True if authentication failed due to invalid or expired credentials.

### authState?

`TAuthState`

Optional state produced during the auth flow, carrying the URL to open.

### authError?

`IError`

Optional structured error covering all failure types (auth, connection, timeout, etc.).

## Returns

`Promise`\<`void`\>
