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

***

### DEFAULT\_AUTH\_CALLBACK\_PATH {#default_auth_callback_path}

> `readonly` `static` **DEFAULT\_AUTH\_CALLBACK\_PATH**: `string` = `"/mailbox/authcallback"`

The callback path used when the configuration does not set one.
Every external authentication flow returns here, whichever mailbox it belongs to.

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

### createMailbox() {#createmailbox}

> **createMailbox**(`mailbox`): `Promise`\<`IMailboxCreateResult`\>

Create a new mailbox and begin polling for it.
Connectors whose credentials are issued by an external flow are asked to start it here, so
the URL the user has to open is returned to the caller which created the mailbox instead of
only surfacing once the first poll has run.

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
An update replaces the credentials the mailbox authenticates with, so a connector whose
credentials are issued by an external flow is asked to start a new one, and the URL the
user has to open is returned the same way it is when the mailbox is created.

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

#### Implementation of

`IMailboxComponent.completeAuth`

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
