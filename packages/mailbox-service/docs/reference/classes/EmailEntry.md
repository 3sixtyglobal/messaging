# Class: EmailEntry

Entity class representing a received email stored in entity storage.

## Constructors

### Constructor

> **new EmailEntry**(): `EmailEntry`

#### Returns

`EmailEntry`

## Properties

### id {#id}

> **id**: `string`

The unique storage identifier for this email.

***

### mailboxId {#mailboxid}

> **mailboxId**: `string`

The identifier of the mailbox that received this email.

***

### receivedAt {#receivedat}

> **receivedAt**: `string`

The ISO 8601 timestamp when this email was stored.

***

### headers? {#headers}

> `optional` **headers?**: `IEmailHeader`[]

The parsed message headers.

***

### messageId? {#messageid}

> `optional` **messageId?**: `string`

The unique message identifier from the email headers.

***

### from? {#from}

> `optional` **from?**: `IEmailAddress`

The sender address (From header).

***

### sender? {#sender}

> `optional` **sender?**: `IEmailAddress`

The Sender header address, when different from From.

***

### to? {#to}

> `optional` **to?**: `IEmailAddress`[]

The primary recipient addresses.

***

### cc? {#cc}

> `optional` **cc?**: `IEmailAddress`[]

The carbon-copy recipient addresses.

***

### bcc? {#bcc}

> `optional` **bcc?**: `IEmailAddress`[]

The blind carbon-copy recipient addresses.

***

### replyTo? {#replyto}

> `optional` **replyTo?**: `IEmailAddress`[]

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

The message subject line.

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

> `optional` **attachments?**: `IEmailAttachment`[]

The attachments included with the message.

***

### flags? {#flags}

> `optional` **flags?**: `string`[]

Protocol-level flags on the message.
