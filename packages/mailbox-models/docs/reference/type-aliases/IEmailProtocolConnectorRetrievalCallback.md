# Type Alias: IEmailProtocolConnectorRetrievalCallback

> **IEmailProtocolConnectorRetrievalCallback** = (`mailboxId`, `message`, `updatedState`, `retrievalError?`) => `Promise`\<`boolean`\>

Callback invoked by a protocol connector to persist a single retrieved message.

## Parameters

### mailboxId

`string`

The identifier of the mailbox this retrieval belongs to.

### message

[`IEmail`](../interfaces/IEmail.md) \| `undefined`

The message to persist.

### updatedState

`unknown`

The connector state to persist on the mailbox entity after this message.

### retrievalError?

`IError`

## Returns

`Promise`\<`boolean`\>

True if the message was persisted successfully; false causes the connector to exit the polling loop.
