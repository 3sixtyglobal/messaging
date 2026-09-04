# Interface: IMailStorageServiceConstructorOptions

Constructor options for the mail storage service.

## Properties

### emailStorageConnectorType? {#emailstorageconnectortype}

> `optional` **emailStorageConnectorType?**: `string`

The type of the entity storage connector to use for email entries.

#### Default

```ts
"email-entry"
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The component type for logging.

#### Default

```ts
"logging"
```

***

### config? {#config}

> `optional` **config?**: [`IMailStorageServiceConfig`](IMailStorageServiceConfig.md)

Optional configuration for the mail storage service.
