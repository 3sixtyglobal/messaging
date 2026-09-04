# Class: MailboxRestClient

REST client proxy for IMailboxComponent.

## Extends

- `BaseRestClient`

## Implements

- `IMailboxComponent`

## Constructors

### Constructor

> **new MailboxRestClient**(`config`, `pathPrefix?`): `MailboxRestClient`

Create a new instance of MailboxRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the REST client.

##### pathPrefix?

`string`

The optional path prefix.

#### Returns

`MailboxRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

The class name.

## Methods

### className() {#classname}

> **className**(): `string`

Get the class name.

#### Returns

`string`

The class name.

#### Implementation of

`IMailboxComponent.className`

***

### addMailbox() {#addmailbox}

> **addMailbox**(`mailbox`): `Promise`\<`string`\>

Add a new mailbox.

#### Parameters

##### mailbox

`Omit`\<`IMailbox`, `"id"` \| `"state"` \| `"authError"` \| `"retrievalError"`\>

The mailbox configuration to add.

#### Returns

`Promise`\<`string`\>

The identifier assigned to the new mailbox.

#### Implementation of

`IMailboxComponent.addMailbox`

***

### updateMailbox() {#updatemailbox}

> **updateMailbox**(`mailbox`): `Promise`\<`void`\>

Update an existing mailbox.

#### Parameters

##### mailbox

`IMailbox`

The updated mailbox configuration.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the mailbox has been updated.

#### Implementation of

`IMailboxComponent.updateMailbox`

***

### removeMailbox() {#removemailbox}

> **removeMailbox**(`id`): `Promise`\<`void`\>

Remove a mailbox and stop polling for it.

#### Parameters

##### id

`string`

The identifier of the mailbox to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the mailbox has been removed.

#### Implementation of

`IMailboxComponent.removeMailbox`

***

### getMailbox() {#getmailbox}

> **getMailbox**(`id`): `Promise`\<`IMailbox`\<`unknown`, `unknown`\>\>

Retrieve a mailbox by its identifier.

#### Parameters

##### id

`string`

The identifier of the mailbox to retrieve.

#### Returns

`Promise`\<`IMailbox`\<`unknown`, `unknown`\>\>

The mailbox.

#### Implementation of

`IMailboxComponent.getMailbox`

***

### listMailboxes() {#listmailboxes}

> **listMailboxes**(`cursor?`, `limit?`): `Promise`\<\{ `mailboxes`: `IMailbox`\<`unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

List all mailboxes with optional cursor-based pagination.

#### Parameters

##### cursor?

`string`

An optional cursor for paginated results.

##### limit?

`number`

An optional maximum number of results to return.

#### Returns

`Promise`\<\{ `mailboxes`: `IMailbox`\<`unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

A page of mailboxes and an optional cursor for the next page.

#### Implementation of

`IMailboxComponent.listMailboxes`
