# Type Alias: IEmailProtocolConnectorAuthCallback\<TAuthState\>

> **IEmailProtocolConnectorAuthCallback**\<`TAuthState`\> = (`mailboxId`, `updatedState`, `requiresAuth`, `authState?`, `authError?`) => `Promise`\<`void`\>

Callback invoked by a protocol connector to report the outcome of an authentication attempt.

## Type Parameters

### TAuthState

`TAuthState` = `unknown`

## Parameters

### mailboxId

`string`

The identifier of the mailbox this authentication attempt belongs to.

### updatedState

`unknown` \| `undefined`

Optional connector state to persist on the mailbox entity.

### requiresAuth

`boolean`

True if authentication failed due to invalid or expired credentials.

### authState?

`TAuthState`

Optional protocol-specific state produced during the auth flow, such as an OAuth URL or code.

### authError?

`IError`

Optional structured error covering all failure types (auth, connection, timeout, etc.).

## Returns

`Promise`\<`void`\>
