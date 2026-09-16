# Interface: IStoredEmail

Interface describing an email message persisted by the mail storage component.

## Extends

- [`IEmail`](IEmail.md)

## Properties

### headers? {#headers}

> `optional` **headers?**: [`IEmailHeader`](IEmailHeader.md)[]

The parsed message headers.

#### Inherited from

[`IEmail`](IEmail.md).[`headers`](IEmail.md#headers)

***

### messageId? {#messageid}

> `optional` **messageId?**: `string`

The unique message identifier.

#### Inherited from

[`IEmail`](IEmail.md).[`messageId`](IEmail.md#messageid)

***

### from? {#from}

> `optional` **from?**: [`IEmailAddress`](IEmailAddress.md)

The sender address (From header).

#### Inherited from

[`IEmail`](IEmail.md).[`from`](IEmail.md#from)

***

### sender? {#sender}

> `optional` **sender?**: [`IEmailAddress`](IEmailAddress.md)

The Sender header address, when different from From.

#### Inherited from

[`IEmail`](IEmail.md).[`sender`](IEmail.md#sender)

***

### to? {#to}

> `optional` **to?**: [`IEmailAddress`](IEmailAddress.md)[]

The primary recipient addresses.

#### Inherited from

[`IEmail`](IEmail.md).[`to`](IEmail.md#to)

***

### cc? {#cc}

> `optional` **cc?**: [`IEmailAddress`](IEmailAddress.md)[]

The carbon-copy recipient addresses.

#### Inherited from

[`IEmail`](IEmail.md).[`cc`](IEmail.md#cc)

***

### bcc? {#bcc}

> `optional` **bcc?**: [`IEmailAddress`](IEmailAddress.md)[]

The blind carbon-copy recipient addresses.

#### Inherited from

[`IEmail`](IEmail.md).[`bcc`](IEmail.md#bcc)

***

### replyTo? {#replyto}

> `optional` **replyTo?**: [`IEmailAddress`](IEmailAddress.md)[]

The reply-to addresses.

#### Inherited from

[`IEmail`](IEmail.md).[`replyTo`](IEmail.md#replyto)

***

### deliveredTo? {#deliveredto}

> `optional` **deliveredTo?**: `string`

The final delivery address from the Delivered-To header.

#### Inherited from

[`IEmail`](IEmail.md).[`deliveredTo`](IEmail.md#deliveredto)

***

### returnPath? {#returnpath}

> `optional` **returnPath?**: `string`

The Return-Path address.

#### Inherited from

[`IEmail`](IEmail.md).[`returnPath`](IEmail.md#returnpath)

***

### inReplyTo? {#inreplyto}

> `optional` **inReplyTo?**: `string`

The Message-ID this message is a reply to.

#### Inherited from

[`IEmail`](IEmail.md).[`inReplyTo`](IEmail.md#inreplyto)

***

### references? {#references}

> `optional` **references?**: `string`

The space-separated list of related message identifiers.

#### Inherited from

[`IEmail`](IEmail.md).[`references`](IEmail.md#references)

***

### subject? {#subject}

> `optional` **subject?**: `string`

The message subject.

#### Inherited from

[`IEmail`](IEmail.md).[`subject`](IEmail.md#subject)

***

### date? {#date}

> `optional` **date?**: `string`

The message date as an ISO 8601 string.

#### Inherited from

[`IEmail`](IEmail.md).[`date`](IEmail.md#date)

***

### textContent? {#textcontent}

> `optional` **textContent?**: `string`

The plain-text body of the message.

#### Inherited from

[`IEmail`](IEmail.md).[`textContent`](IEmail.md#textcontent)

***

### htmlContent? {#htmlcontent}

> `optional` **htmlContent?**: `string`

The HTML body of the message.

#### Inherited from

[`IEmail`](IEmail.md).[`htmlContent`](IEmail.md#htmlcontent)

***

### attachments? {#attachments}

> `optional` **attachments?**: [`IEmailAttachment`](IEmailAttachment.md)[]

The attachments included with the message.

#### Inherited from

[`IEmail`](IEmail.md).[`attachments`](IEmail.md#attachments)

***

### flags? {#flags}

> `optional` **flags?**: `string`[]

Protocol-level flags on the message, for example \\Seen.

#### Inherited from

[`IEmail`](IEmail.md).[`flags`](IEmail.md#flags)

***

### id {#id}

> **id**: `string`

The storage entity identifier.

***

### mailboxId {#mailboxid}

> **mailboxId**: `string`

The identifier of the mailbox that received the message.

***

### receivedAt {#receivedat}

> **receivedAt**: `string`

The ISO 8601 timestamp when the message was stored.
