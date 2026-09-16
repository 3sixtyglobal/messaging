# Interface: IEmail

Interface describing a normalised email message at the connector boundary.

## Extended by

- [`IStoredEmail`](IStoredEmail.md)

## Properties

### headers? {#headers}

> `optional` **headers?**: [`IEmailHeader`](IEmailHeader.md)[]

The parsed message headers.

***

### messageId? {#messageid}

> `optional` **messageId?**: `string`

The unique message identifier.

***

### from? {#from}

> `optional` **from?**: [`IEmailAddress`](IEmailAddress.md)

The sender address (From header).

***

### sender? {#sender}

> `optional` **sender?**: [`IEmailAddress`](IEmailAddress.md)

The Sender header address, when different from From.

***

### to? {#to}

> `optional` **to?**: [`IEmailAddress`](IEmailAddress.md)[]

The primary recipient addresses.

***

### cc? {#cc}

> `optional` **cc?**: [`IEmailAddress`](IEmailAddress.md)[]

The carbon-copy recipient addresses.

***

### bcc? {#bcc}

> `optional` **bcc?**: [`IEmailAddress`](IEmailAddress.md)[]

The blind carbon-copy recipient addresses.

***

### replyTo? {#replyto}

> `optional` **replyTo?**: [`IEmailAddress`](IEmailAddress.md)[]

The reply-to addresses.

***

### deliveredTo? {#deliveredto}

> `optional` **deliveredTo?**: `string`

The final delivery address from the Delivered-To header.

***

### returnPath? {#returnpath}

> `optional` **returnPath?**: `string`

The Return-Path address.

***

### inReplyTo? {#inreplyto}

> `optional` **inReplyTo?**: `string`

The Message-ID this message is a reply to.

***

### references? {#references}

> `optional` **references?**: `string`

The space-separated list of related message identifiers.

***

### subject? {#subject}

> `optional` **subject?**: `string`

The message subject.

***

### date? {#date}

> `optional` **date?**: `string`

The message date as an ISO 8601 string.

***

### textContent? {#textcontent}

> `optional` **textContent?**: `string`

The plain-text body of the message.

***

### htmlContent? {#htmlcontent}

> `optional` **htmlContent?**: `string`

The HTML body of the message.

***

### attachments? {#attachments}

> `optional` **attachments?**: [`IEmailAttachment`](IEmailAttachment.md)[]

The attachments included with the message.

***

### flags? {#flags}

> `optional` **flags?**: `string`[]

Protocol-level flags on the message, for example \\Seen.
