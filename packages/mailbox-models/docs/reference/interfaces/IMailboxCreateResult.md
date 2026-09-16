# Interface: IMailboxCreateResult

The outcome of creating a mailbox.

## Properties

### id {#id}

> **id**: `string`

The identifier assigned to the new mailbox.

***

### authUrl? {#authurl}

> `optional` **authUrl?**: `string`

The URL to open for the user when the mailbox cannot be polled until an external
authentication flow has completed, such as an OAuth consent URL. Absent when the supplied
configuration is already sufficient to poll the mailbox.
