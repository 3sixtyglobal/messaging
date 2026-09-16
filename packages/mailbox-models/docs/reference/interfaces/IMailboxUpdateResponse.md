# Interface: IMailboxUpdateResponse

Response to updating a mailbox.

## Properties

### statusCode {#statuscode}

> **statusCode**: `200`

Response status code.

***

### body {#body}

> **body**: `object`

The body of the response.

#### authUrl?

> `optional` **authUrl?**: `string`

The URL to open for the user when the updated mailbox must complete an external
authentication flow, such as an OAuth consent URL, before it can be polled.
