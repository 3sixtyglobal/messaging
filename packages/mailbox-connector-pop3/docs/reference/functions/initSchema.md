# Function: initSchema()

> **initSchema**(): `void`

Initialise the connector schemas for the POP3 connector.
The connector constructor calls this as well, so registering here is only needed to make the
schemas available before any connector instance has been built, such as for a mailbox which
is stored but not currently polled.

## Returns

`void`
