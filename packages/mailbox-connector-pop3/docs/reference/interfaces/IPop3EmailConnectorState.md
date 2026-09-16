# Interface: IPop3EmailConnectorState

Runtime state persisted between poll cycles for a POP3 connector.

## Properties

### seenUidls? {#seenuidls}

> `optional` **seenUidls?**: `string`[]

The set of unique IDs (UIDLs) already retrieved from the server.
Populated via the POP3 UIDL command, which assigns a stable per-message identifier
that remains constant across sessions regardless of message numbering changes.
