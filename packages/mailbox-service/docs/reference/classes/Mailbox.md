# Class: Mailbox

Entity class representing a mailbox stored in entity storage.

## Constructors

### Constructor

> **new Mailbox**(): `Mailbox`

#### Returns

`Mailbox`

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

> `optional` **config?**: `unknown`

The connector-owned configuration for this mailbox.

***

### enabled {#enabled}

> **enabled**: `boolean`

Whether this mailbox is active and should be polled.

***

### state? {#state}

> `optional` **state?**: `unknown`

The connector-owned runtime state for this mailbox.

***

### requiresAuth? {#requiresauth}

> `optional` **requiresAuth?**: `boolean`

Whether this mailbox is awaiting re-authentication.

***

### authState? {#authstate}

> `optional` **authState?**: `unknown`

Optional protocol-specific state produced during the auth flow, such as an OAuth URL or code.

***

### authError? {#autherror}

> `optional` **authError?**: `IError`

The last error returned by the authentication callback.

***

### retrievalError? {#retrievalerror}

> `optional` **retrievalError?**: `IError`

The last error returned by the retrieval callback.

***

### nodeId {#nodeid}

> **nodeId**: `string`

The node identifier captured at creation time.

***

### tenantId? {#tenantid}

> `optional` **tenantId?**: `string`

The tenant identifier captured at creation time. Absent on single-tenant nodes.
