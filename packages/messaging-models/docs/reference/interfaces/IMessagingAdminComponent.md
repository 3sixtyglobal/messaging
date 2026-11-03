# Interface: IMessagingAdminComponent

Interface describing the messaging admin component.

## Extends

- `IComponent`

## Methods

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

***

### getTemplate() {#gettemplate}

> **getTemplate**(`templateId`, `locale`): `Promise`\<\{ `title`: `string`; `content`: `string`; `locale`: `string`; \}\>

Get the email template by id and locale, or for the default locale when there is none for the locale.

#### Parameters

##### templateId

`string`

The id of the email template.

##### locale

`string`

The locale of the email template.

#### Returns

`Promise`\<\{ `title`: `string`; `content`: `string`; `locale`: `string`; \}\>

The email template, with the locale of the template found.

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
