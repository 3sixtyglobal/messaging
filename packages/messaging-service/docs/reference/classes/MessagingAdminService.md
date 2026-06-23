# Class: MessagingAdminService

Service for managing message templates stored via entity storage.

## Implements

- `IMessagingAdminComponent`

## Constructors

### Constructor

> **new MessagingAdminService**(`options?`): `MessagingAdminService`

Create a new instance of MessagingAdminService.

#### Parameters

##### options?

[`IMessagingAdminServiceConstructorOptions`](../interfaces/IMessagingAdminServiceConstructorOptions.md)

The options for the service.

#### Returns

`MessagingAdminService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IMessagingAdminComponent.className`

***

### setTemplate() {#settemplate}

> **setTemplate**(`templateId`, `locale`, `title`, `content`): `Promise`\<`void`\>

Create or update a template.

#### Parameters

##### templateId

`string`

The id of the template.

##### locale

`string`

The locale of the template.

##### title

`string`

The title of the template.

##### content

`string`

The content of the template.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the template has been stored.

#### Implementation of

`IMessagingAdminComponent.setTemplate`

***

### getTemplate() {#gettemplate}

> **getTemplate**(`templateId`, `locale`): `Promise`\<\{ `title`: `string`; `content`: `string`; \}\>

Get the email template by id and locale.

#### Parameters

##### templateId

`string`

The id of the email template.

##### locale

`string`

The locale of the email template.

#### Returns

`Promise`\<\{ `title`: `string`; `content`: `string`; \}\>

The email template.

#### Implementation of

`IMessagingAdminComponent.getTemplate`

***

### removeTemplate() {#removetemplate}

> **removeTemplate**(`templateId`, `locale`): `Promise`\<`void`\>

Remove a template.

#### Parameters

##### templateId

`string`

The id of the template.

##### locale

`string`

The locale of the template.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the template has been removed.

#### Implementation of

`IMessagingAdminComponent.removeTemplate`
