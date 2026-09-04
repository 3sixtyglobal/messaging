# Interface: IMailboxServiceConstructorOptions

Constructor options for the mailbox service.

## Properties

### mailboxStorageConnectorType? {#mailboxstorageconnectortype}

> `optional` **mailboxStorageConnectorType?**: `string`

The type of the entity storage connector to use for mailbox entries.

#### Default

```ts
"mailbox-entry"
```

***

### vaultConnectorType? {#vaultconnectortype}

> `optional` **vaultConnectorType?**: `string`

The type of the vault connector used to store secure config fields.

#### Default

```ts
"vault"
```

***

### mailStorageComponentType? {#mailstoragecomponenttype}

> `optional` **mailStorageComponentType?**: `string`

The component type for the mail storage component.

#### Default

```ts
"mail-storage"
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

### telemetryComponentType? {#telemetrycomponenttype}

> `optional` **telemetryComponentType?**: `string`

The component type for telemetry.

#### Default

```ts
"telemetry"
```

***

### platformComponentType? {#platformcomponenttype}

> `optional` **platformComponentType?**: `string`

The component type for the platform component used to enumerate tenant partitions.

#### Default

```ts
"platform"
```
