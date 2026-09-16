# Class: MailStorageRestClient

REST client proxy for IMailStorageComponent.

## Extends

- `BaseRestClient`

## Implements

- `IMailStorageComponent`

## Constructors

### Constructor

> **new MailStorageRestClient**(`config`, `pathPrefix?`): `MailStorageRestClient`

Create a new instance of MailStorageRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the REST client.

##### pathPrefix?

`string`

The optional path prefix.

#### Returns

`MailStorageRestClient`

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

`IMailStorageComponent.className`

***

### store() {#store}

> **store**(`mailboxId`, `email`): `Promise`\<`string`\>

Store an email received from a mailbox. Not supported over REST.

#### Parameters

##### mailboxId

`string`

The identifier of the mailbox.

##### email

`IEmail`

The email to store.

#### Returns

`Promise`\<`string`\>

The identifier assigned to the stored email.

#### Implementation of

`IMailStorageComponent.store`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IStoredEmail`\>

Retrieve a stored email by its identifier.

#### Parameters

##### id

`string`

The identifier of the stored email.

#### Returns

`Promise`\<`IStoredEmail`\>

The stored email.

#### Implementation of

`IMailStorageComponent.get`

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

#### Implementation of

`IMailStorageComponent.remove`

***

### query() {#query}

> **query**(`sinceEpoch`, `mailboxId?`, `cursor?`, `limit?`): `Promise`\<\{ `emails`: `IStoredEmail`[]; `cursor?`: `string`; \}\>

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

`Promise`\<\{ `emails`: `IStoredEmail`[]; `cursor?`: `string`; \}\>

A page of stored emails and an optional cursor for the next page.

#### Implementation of

`IMailStorageComponent.query`
