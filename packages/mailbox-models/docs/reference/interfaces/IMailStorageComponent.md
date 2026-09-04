# Interface: IMailStorageComponent

Interface describing the mail storage component for persisting and querying received emails.

## Extends

- `IComponent`

## Methods

### store() {#store}

> **store**(`mailboxId`, `email`): `Promise`\<`string`\>

Store an email received from a mailbox.

#### Parameters

##### mailboxId

`string`

The identifier of the mailbox that received the email.

##### email

[`IEmail`](IEmail.md)

The email to store.

#### Returns

`Promise`\<`string`\>

The identifier assigned to the stored email.

***

### get() {#get}

> **get**(`id`): `Promise`\<[`IStoredEmail`](IStoredEmail.md)\>

Retrieve a stored email by its identifier.

#### Parameters

##### id

`string`

The identifier of the stored email.

#### Returns

`Promise`\<[`IStoredEmail`](IStoredEmail.md)\>

The stored email.

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove a stored email by its identifier.

#### Parameters

##### id

`string`

The identifier of the stored email to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the email has been removed.

***

### query() {#query}

> **query**(`sinceEpoch`, `mailboxId?`, `cursor?`, `limit?`): `Promise`\<\{ `emails`: [`IStoredEmail`](IStoredEmail.md)[]; `cursor?`: `string`; \}\>

Query stored emails received at or after a given epoch.

#### Parameters

##### sinceEpoch

`string`

The ISO 8601 timestamp to filter emails received at or after.

##### mailboxId?

`string`

An optional mailbox identifier to restrict results to.

##### cursor?

`string`

An optional cursor for paginated results.

##### limit?

`number`

An optional maximum number of results to return.

#### Returns

`Promise`\<\{ `emails`: [`IStoredEmail`](IStoredEmail.md)[]; `cursor?`: `string`; \}\>

A page of stored emails and an optional cursor for the next page.
