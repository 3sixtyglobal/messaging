# Interface: IOutlookEmailConnectorConstructorOptions

Constructor options for the Outlook email connector.

## Properties

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

***

### config {#config}

> **config**: [`IOutlookEmailConnectorConfig`](IOutlookEmailConnectorConfig.md)

The configuration for the Outlook connector.
