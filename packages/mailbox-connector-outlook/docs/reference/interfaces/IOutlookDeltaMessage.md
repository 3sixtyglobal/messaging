# Interface: IOutlookDeltaMessage

A message as a Microsoft Graph delta cursor reports it, before its content has been fetched.

## Properties

### id {#id}

> **id**: `string`

The identifier of the message within the mailbox.

***

### receivedDateTime? {#receiveddatetime}

> `optional` **receivedDateTime?**: `string`

When the message was received, as an ISO 8601 timestamp.

***

### categories? {#categories}

> `optional` **categories?**: `string`[]

The Outlook categories on the message, reported as the protocol flags of the email.
