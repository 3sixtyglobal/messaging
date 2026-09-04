# Interface: IMailStorageListRequest

Request to query stored emails.

## Properties

### query {#query}

> **query**: `object`

The query parameters.

#### since

> **since**: `string`

Return only emails received at or after this ISO 8601 timestamp.

#### mailboxId?

> `optional` **mailboxId?**: `string`

Filter emails by mailbox identifier.

#### cursor?

> `optional` **cursor?**: `string`

The cursor for paginated results.

#### limit?

> `optional` **limit?**: `string`

The maximum number of results to return.
