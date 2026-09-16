# Interface: IMailboxUpdateResult

The outcome of updating a mailbox.

## Properties

### authUrl? {#authurl}

> `optional` **authUrl?**: `string`

The URL to open for the user when the updated mailbox cannot be polled until an external
authentication flow has completed, such as an OAuth consent URL. Absent when the updated
configuration is already sufficient to poll the mailbox.
