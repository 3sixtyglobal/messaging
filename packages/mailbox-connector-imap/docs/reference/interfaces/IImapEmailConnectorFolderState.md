# Interface: IImapEmailConnectorFolderState

Per-folder polling state for the IMAP connector.

## Properties

### uidValidity? {#uidvalidity}

> `optional` **uidValidity?**: `string`

The UID validity value at the time of the last successful poll,
serialised as a string to survive JSON round-trips.
When this changes the connector resets lastUid to 0.

***

### lastUid? {#lastuid}

> `optional` **lastUid?**: `number`

The highest UID successfully processed in the last poll cycle.
The next poll fetches UIDs strictly greater than this value.
