# Interface: IMailboxComponent

Interface describing the mailbox management component.

## Extends

- `IComponent`

## Methods

### addMailbox() {#addmailbox}

> **addMailbox**(`mailbox`): `Promise`\<`string`\>

Add a new mailbox and begin polling for it.

#### Parameters

##### mailbox

`Pick`\<[`IMailbox`](IMailbox.md), `"name"` \| `"connectorType"` \| `"config"` \| `"enabled"`\>

The mailbox configuration to add.

#### Returns

`Promise`\<`string`\>

The identifier assigned to the new mailbox.

***

### updateMailbox() {#updatemailbox}

> **updateMailbox**(`mailbox`): `Promise`\<`void`\>

Update an existing mailbox.

#### Parameters

##### mailbox

[`IMailbox`](IMailbox.md)

The updated mailbox configuration.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the mailbox has been updated.

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

***

### getMailbox() {#getmailbox}

> **getMailbox**(`id`): `Promise`\<[`IMailbox`](IMailbox.md)\<`unknown`, `unknown`, `unknown`\>\>

Retrieve a mailbox by its identifier.

#### Parameters

##### id

`string`

The identifier of the mailbox to retrieve.

#### Returns

`Promise`\<[`IMailbox`](IMailbox.md)\<`unknown`, `unknown`, `unknown`\>\>

The mailbox.

***

### listMailboxes() {#listmailboxes}

> **listMailboxes**(`cursor?`, `limit?`): `Promise`\<\{ `mailboxes`: [`IMailbox`](IMailbox.md)\<`unknown`, `unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

List all mailboxes with optional cursor-based pagination.

#### Parameters

##### cursor?

`string`

An optional cursor for paginated results.

##### limit?

`number`

An optional maximum number of results to return.

#### Returns

`Promise`\<\{ `mailboxes`: [`IMailbox`](IMailbox.md)\<`unknown`, `unknown`, `unknown`\>[]; `cursor?`: `string`; \}\>

A page of mailboxes and an optional cursor for the next page.

***

### getSchema() {#getschema}

> **getSchema**(`connectorType`): `Promise`\<[`IMailboxConfigField`](IMailboxConfigField.md)[]\>

Get the configuration schema for a connector type.

#### Parameters

##### connectorType

`string`

The connector type to get the schema for.

#### Returns

`Promise`\<[`IMailboxConfigField`](IMailboxConfigField.md)[]\>

The configuration field definitions for the connector.

#### Throws

NotFoundError if no schema is registered for the connector type.
