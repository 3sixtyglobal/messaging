# Type Alias: IEmailProtocolConnectorRetrievalCallback

> **IEmailProtocolConnectorRetrievalCallback** = (`mailboxId`, `messages`, `updatedState`, `error?`) => `Promise`\<`void`\>

Callback invoked by a protocol connector to deliver retrieved messages or report a retrieval failure.

## Parameters

### mailboxId

`string`

The identifier of the mailbox this retrieval belongs to.

### messages

[`IEmail`](../interfaces/IEmail.md)[]

The messages retrieved during this poll cycle.

### updatedState

`unknown`

The connector state to persist on the mailbox entity after this poll.

### error?

`IError`

Optional structured error if retrieval failed; stored as retrievalError on the mailbox.

## Returns

`Promise`\<`void`\>
