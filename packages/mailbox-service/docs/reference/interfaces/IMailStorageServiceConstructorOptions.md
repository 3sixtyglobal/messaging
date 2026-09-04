# Interface: IMailStorageServiceConstructorOptions

Constructor options for the mail storage service.

## Properties

### storedEmailEntityStorageType? {#storedemailentitystoragetype}

> `optional` **storedEmailEntityStorageType?**: `string`

The type of the entity storage connector to use for email entries.

#### Default

```ts
stored-email
```

***

### taskSchedulerComponentType? {#taskschedulercomponenttype}

> `optional` **taskSchedulerComponentType?**: `string`

The component type for the task scheduler used for retention cleanup.

#### Default

```ts
task-scheduler
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The component type for logging.

#### Default

```ts
logging
```

***

### config? {#config}

> `optional` **config?**: [`IMailStorageServiceConfig`](IMailStorageServiceConfig.md)

Optional configuration for the mail storage service.
