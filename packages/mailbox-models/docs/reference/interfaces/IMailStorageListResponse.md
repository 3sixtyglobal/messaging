# Interface: IMailStorageListResponse

Response from querying stored emails.

## Properties

### body {#body}

> **body**: `object`

The result body.

#### emails

> **emails**: [`IStoredEmail`](IStoredEmail.md)[]

The list of stored emails.

#### cursor?

> `optional` **cursor?**: `string`

The cursor for the next page of results.
