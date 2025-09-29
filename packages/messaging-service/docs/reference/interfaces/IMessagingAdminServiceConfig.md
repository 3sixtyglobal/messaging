# Interface: IMessagingAdminServiceConfig

Options for the messaging service.

## Properties

### defaultLocale?

> `optional` **defaultLocale**: `string`

The default locale to use for the messaging service.

#### Default

```ts
en
```

***

### templates?

> `optional` **templates**: `object`[]

Initial set of templates to create on startup.

#### templateId

> **templateId**: `string`

#### title

> **title**: `string`

#### content

> **content**: `object`

##### Index Signature

\[`locale`: `string`\]: `string`
