# Interface: IImapEmailConnectorConstructorOptions

Constructor options for the IMAP email connector.

## Properties

### config {#config}

> **config**: [`IImapEmailConnectorConfig`](IImapEmailConnectorConfig.md)

The configuration for the IMAP connector.

***

### taskSchedulerComponentType? {#taskschedulercomponenttype}

> `optional` **taskSchedulerComponentType?**: `string`

The component type for the task scheduler used to manage polling intervals.

#### Default

```ts
"task-scheduler"
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The component type for logging.
