# Interface: IMailboxListResponse

Response from listing mailboxes.

## Properties

### body {#body}

> **body**: `object`

The result body.

#### mailboxes

> **mailboxes**: [`IMailbox`](IMailbox.md)\<`unknown`, `unknown`, `unknown`\>[]

The list of mailboxes.

#### cursor?

> `optional` **cursor?**: `string`

The cursor for the next page of results.
