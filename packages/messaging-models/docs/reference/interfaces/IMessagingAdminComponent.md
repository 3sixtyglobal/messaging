# Interface: IMessagingAdminComponent

Interface describing the messaging admin component.

## Extends

- `IComponent`

## Indexable

\[`key`: `string`\]: `any`

All methods are optional, so we introduce an index signature to allow
any additional properties or methods, which removes the TypeScript error where
the class has no properties in common with the type.

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

If the template was created or updated successfully.

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

Nothing.
