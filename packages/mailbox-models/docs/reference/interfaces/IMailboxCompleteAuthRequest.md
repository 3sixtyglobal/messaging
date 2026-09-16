# Interface: IMailboxCompleteAuthRequest

Request to complete an authentication flow, sent by the external provider redirecting the
browser to the fixed callback route.

## Properties

### query {#query}

> **query**: `object`

The query parameters the provider appends to the callback URI.

#### Index Signature

\[`propertyKey`: `string`\]: `string`

#### state

> **state**: `string`

The correlating state the connector placed in the external flow.
