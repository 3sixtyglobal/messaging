# Interface: IMailboxCreateResponse

Response to creating a new mailbox.

## Properties

### statusCode {#statuscode}

> **statusCode**: `201`

Response status code.

***

### headers {#headers}

> **headers**: `object`

Additional response headers.

#### location

> **location**: `string`

The location where the mailbox was created.

***

### body {#body}

> **body**: `object`

The body of the response.

#### authUrl?

> `optional` **authUrl?**: `string`

The URL to open for the user when the mailbox must complete an external authentication
flow, such as an OAuth consent URL, before it can be polled.
