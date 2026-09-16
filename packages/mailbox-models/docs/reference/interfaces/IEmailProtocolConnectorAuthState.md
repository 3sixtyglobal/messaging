# Interface: IEmailProtocolConnectorAuthState

The state a protocol connector produces when a mailbox has to be authenticated by an
external flow. Connectors which carry more through the flow extend this with their own
properties, but the URL is named here so callers can open it without knowing the protocol.

## Properties

### authUrl? {#authurl}

> `optional` **authUrl?**: `string`

The URL to open for the user to authenticate the mailbox, such as an OAuth consent URL.
Absent when the connector has no URL to send the user to.
