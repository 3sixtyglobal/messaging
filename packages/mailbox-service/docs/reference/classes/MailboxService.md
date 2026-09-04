# Class: MailboxService

Service implementing mailbox management, polling orchestration, and consumer notification.

## Implements

- `IMailboxComponent`

## Constructors

### Constructor

> **new MailboxService**(`options?`): `MailboxService`

Create a new instance of MailboxService.

#### Parameters

##### options?

[`IMailboxServiceConstructorOptions`](../interfaces/IMailboxServiceConstructorOptions.md)

The options for the service.

#### Returns

`MailboxService`

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

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

Start the component, register metrics, and resume polling for all enabled mailboxes.

#### Parameters

##### nodeLoggingComponentType?

`string`

Optional logging component type for node-level logging.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the component has started.

#### Implementation of

`IMailboxComponent.start`

***

### stop() {#stop}

> **stop**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

Stop the component and halt polling for all mailboxes.

#### Parameters

##### nodeLoggingComponentType?

`string`

Optional logging component type for node-level logging.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the component has stopped.

#### Implementation of

`IMailboxComponent.stop`

***

### addMailbox() {#addmailbox}

> **addMailbox**(`mailbox`): `Promise`\<`string`\>

Add a new mailbox and begin polling for it.

#### Parameters

##### mailbox

`Pick`\<`IMailbox`, `"name"` \| `"connectorType"` \| `"config"` \| `"enabled"`\>

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

#### Throws

NotFoundError if no schema is registered for the connector type.

#### Implementation of

`IMailboxComponent.getSchema`
