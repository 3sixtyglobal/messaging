# Interface: IPop3EmailConnectorConstructorOptions

Constructor options for the POP3 email connector.

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

> **config**: [`IPop3EmailConnectorConfig`](IPop3EmailConnectorConfig.md)

The configuration for the POP3 connector.
