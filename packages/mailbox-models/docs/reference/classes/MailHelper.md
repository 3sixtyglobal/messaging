# Class: MailHelper

Shared utilities for parsing raw RFC822 email messages and mapping postal-mime address objects.

## Constructors

### Constructor

> **new MailHelper**(): `MailHelper`

#### Returns

`MailHelper`

## Methods

### mapAddress() {#mapaddress}

> `static` **mapAddress**(`address?`): [`IEmailAddress`](../interfaces/IEmailAddress.md) \| `undefined`

Map a postal-mime address object to an IEmailAddress, or return undefined when no address is present.

#### Parameters

##### address?

The postal-mime address to map.

###### name

`string`

The display name of the email address.

###### address?

`string`

The email address string.

#### Returns

[`IEmailAddress`](../interfaces/IEmailAddress.md) \| `undefined`

The mapped address, or undefined.

***

### mapAddresses() {#mapaddresses}

> `static` **mapAddresses**(`addresses`): [`IEmailAddress`](../interfaces/IEmailAddress.md)[] \| `undefined`

Map an array of postal-mime address objects to IEmailAddress[], or return undefined when the input is empty.

#### Parameters

##### addresses

`object`[] \| `undefined`

The postal-mime addresses to map.

#### Returns

[`IEmailAddress`](../interfaces/IEmailAddress.md)[] \| `undefined`

The mapped addresses, or undefined.

***

### parseEmail() {#parseemail}

> `static` **parseEmail**(`raw`, `flags?`): `Promise`\<[`IEmail`](../interfaces/IEmail.md) \| `undefined`\>

Parse a raw RFC822 email string into an IEmail object using postal-mime.

#### Parameters

##### raw

`string`

The raw email string.

##### flags?

`string`[]

Optional IMAP flags associated with the message.

#### Returns

`Promise`\<[`IEmail`](../interfaces/IEmail.md) \| `undefined`\>

The parsed email, or undefined if the input is empty.
