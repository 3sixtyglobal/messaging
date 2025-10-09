# Interface: IMessagingEmailConnector

Interface describing the email messaging connector functionalities

## Extends

- `IComponent`

## Indexable

\[`key`: `string`\]: `any`

All methods are optional, so we introduce an index signature to allow
any additional properties or methods, which removes the TypeScript error where
the class has no properties in common with the type.

## Methods

### sendCustomEmail()

> **sendCustomEmail**(`sender`, `recipients`, `subject`, `content`): `Promise`\<`boolean`\>

Send a custom email.

#### Parameters

##### sender

`string`

The sender email address.

##### recipients

`string`[]

An array of recipients email addresses.

##### subject

`string`

The subject of the email.

##### content

`string`

The html content of the email.

#### Returns

`Promise`\<`boolean`\>

If the email was sent successfully.
