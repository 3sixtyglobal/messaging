# Interface: IMailbox\<TConfig, TState, TAuthState\>

Interface describing a mailbox configuration.

## Type Parameters

### TConfig

`TConfig` = `unknown`

### TState

`TState` = `unknown`

### TAuthState

`TAuthState` = `unknown`

## Properties

### id {#id}

> **id**: `string`

The unique identifier for the mailbox.

***

### name {#name}

> **name**: `string`

The display name for the mailbox.

***

### connectorType {#connectortype}

> **connectorType**: `string`

The connector type identifying which connector handles this mailbox.

***

### config? {#config}

> `optional` **config?**: `TConfig`

The connector-owned configuration for this mailbox.

***

### state? {#state}

> `optional` **state?**: `TState`

The connector-owned runtime state for this mailbox.

***

### enabled {#enabled}

> **enabled**: `boolean`

Whether this mailbox is active and should be polled.

***

### requiresAuth? {#requiresauth}

> `optional` **requiresAuth?**: `boolean`

Whether this mailbox is awaiting re-authentication.

***

### authState? {#authstate}

> `optional` **authState?**: `TAuthState`

Optional protocol-specific state produced during the auth flow, such as an OAuth URL or code.

***

### authError? {#autherror}

> `optional` **authError?**: `IError`

The last error returned by the authentication callback; cleared on successful authentication.

***

### retrievalError? {#retrievalerror}

> `optional` **retrievalError?**: `IError`

The last error returned by the retrieval callback; cleared on successful retrieval.
