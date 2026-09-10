# Interface: IMailboxComponent

Interface describing the mailbox management component.

## Extends

- `IComponent`

## Methods

### createMailbox() {#createmailbox}

> **createMailbox**(`mailbox`): `Promise`\<[`IMailboxCreateResult`](IMailboxCreateResult.md)\>

Create a new mailbox and begin polling for it.
Connectors whose credentials are issued by an external flow are asked to start it here, so
the URL the user has to open is returned to the caller which created the mailbox instead of
only surfacing once the first poll has run.

#### Parameters

##### mailbox

`Pick`\<[`IMailbox`](IMailbox.md), `"name"` \| `"connectorType"` \| `"config"` \| `"enabled"`\>

The mailbox configuration to create.

#### Returns

`Promise`\<[`IMailboxCreateResult`](IMailboxCreateResult.md)\>

The identifier assigned to the new mailbox, with the URL to open when the mailbox
must be authenticated before it can be polled.

***

### updateMailbox() {#updatemailbox}

> **updateMailbox**(`mailbox`): `Promise`\<[`IMailboxUpdateResult`](IMailboxUpdateResult.md)\>

Update an existing mailbox.
An update replaces the credentials the mailbox authenticates with, so a connector whose
credentials are issued by an external flow is asked to start a new one, and the URL the
user has to open is returned the same way it is when the mailbox is created.

#### Parameters

##### mailbox

[`IMailbox`](IMailbox.md)

The updated mailbox configuration.

#### Returns

`Promise`\<[`IMailboxUpdateResult`](IMailboxUpdateResult.md)\>

The URL to open when the mailbox must be authenticated before it can be polled.

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

### completeAuth() {#completeauth}

> **completeAuth**(`authPayload`): `Promise`\<`void`\>

Complete an authentication flow for a mailbox awaiting authentication.
The mailbox is correlated from the payload's state property, which the connector placed in
the external flow when it produced its auth state, and which names the partition as well as
the mailbox. The connector exchanges the payload for its credentials, which are stored on
the mailbox state, and polling restarts.

#### Parameters

##### authPayload

`unknown`

The data handed to the callback URI, carrying the correlating state.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the mailbox has been authenticated.

#### Throws

NotFoundError if the correlated mailbox does not exist.

#### Throws

GeneralError if the mailbox is not awaiting authentication, or its connector has no
authentication flow.

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
