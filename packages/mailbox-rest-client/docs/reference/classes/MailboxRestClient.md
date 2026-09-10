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

### createMailbox() {#createmailbox}

> **createMailbox**(`mailbox`): `Promise`\<`IMailboxCreateResult`\>

Create a new mailbox.

#### Parameters

##### mailbox

`Pick`\<`IMailbox`, `"name"` \| `"connectorType"` \| `"config"` \| `"enabled"`\>

The mailbox configuration to create.

#### Returns

`Promise`\<`IMailboxCreateResult`\>

The identifier assigned to the new mailbox, with the URL to open when the mailbox
must be authenticated before it can be polled.

#### Implementation of

`IMailboxComponent.createMailbox`

***

### updateMailbox() {#updatemailbox}

> **updateMailbox**(`mailbox`): `Promise`\<`IMailboxUpdateResult`\>

Update an existing mailbox.

#### Parameters

##### mailbox

`IMailbox`

The updated mailbox configuration.

#### Returns

`Promise`\<`IMailboxUpdateResult`\>

The URL to open when the mailbox must be authenticated before it can be polled.

#### Implementation of

`IMailboxComponent.updateMailbox`

***

### completeAuth() {#completeauth}

> **completeAuth**(`authPayload`): `Promise`\<`void`\>

Complete an authentication flow, correlating the callback to the pending mailbox.

#### Parameters

##### authPayload

`unknown`

The data handed to the callback URI, carrying the correlating state.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the mailbox has been authenticated.

#### Throws

NotSupportedError the flow is completed by the provider redirecting the browser to
the service's own callback route, which skips authentication for that reason.

#### Implementation of

`IMailboxComponent.completeAuth`

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

> **getMailbox**(`id`): `Promise`\<`IMailbox`\<`unknown`, `unknown`, `unknown`\>\>

Retrieve a mailbox by its identifier.

#### Parameters

##### id

`string`

The identifier of the mailbox to retrieve.

#### Returns

`Promise`\<`IMailbox`\<`unknown`, `unknown`, `unknown`\>\>

The mailbox.

#### Implementation of

`IMailboxComponent.getMailbox`

***

### listMailboxes() {#listmailboxes}

> **listMailboxes**(`cursor?`, `limit?`): `Promise`\<\{ `mailboxes`: `IMailbox`\<`unknown`, `unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

List all mailboxes with optional cursor-based pagination.

#### Parameters

##### cursor?

`string`

An optional cursor for paginated results.

##### limit?

`number`

An optional maximum number of results to return.

#### Returns

`Promise`\<\{ `mailboxes`: `IMailbox`\<`unknown`, `unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

A page of mailboxes and an optional cursor for the next page.

#### Implementation of

`IMailboxComponent.listMailboxes`

***

### getSchema() {#getschema}

> **getSchema**(`connectorType`): `Promise`\<`IMailboxConfigField`[]\>

Get the configuration schema for a connector type.

#### Parameters

##### connectorType

`string`

The connector type to get the schema for.

#### Returns

`Promise`\<`IMailboxConfigField`[]\>

The configuration field definitions for the connector.

#### Implementation of

`IMailboxComponent.getSchema`
