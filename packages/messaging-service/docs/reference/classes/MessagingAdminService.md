# Class: MessagingAdminService

Service for performing email messaging operations to a connector.

## Implements

- `IMessagingAdminComponent`

## Constructors

### Constructor

> **new MessagingAdminService**(`options?`): `MessagingAdminService`

Create a new instance of MessagingAdminService.

#### Parameters

##### options?

[`IMessagingAdminServiceConstructorOptions`](../interfaces/IMessagingAdminServiceConstructorOptions.md)

The options for the connector.

#### Returns

`MessagingAdminService`

## Properties

### CLASS\_NAME

> `readonly` **CLASS\_NAME**: `string`

Runtime name for the class.

#### Implementation of

`IMessagingAdminComponent.CLASS_NAME`

## Methods

### setTemplate()

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

Nothing.

#### Implementation of

`IMessagingAdminComponent.setTemplate`

***

### getTemplate()

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

### removeTemplate()

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

Nothing

#### Implementation of

`IMessagingAdminComponent.removeTemplate`
