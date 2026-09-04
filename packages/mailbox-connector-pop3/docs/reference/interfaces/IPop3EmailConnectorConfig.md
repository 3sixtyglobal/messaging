# Interface: IPop3EmailConnectorConfig

Configuration for a POP3 protocol connector.

## Properties

### host {#host}

> **host**: `string`

The hostname or IP address of the POP3 server.

***

### port? {#port}

> `optional` **port?**: `number`

The port number of the POP3 server.

#### Default

```ts
110
```

***

### secure? {#secure}

> `optional` **secure?**: `boolean`

Whether to use TLS (port 995) or plaintext (port 110).

#### Default

```ts
false
```

***

### username {#username}

> **username**: `string`

The username for authentication.

***

### password {#password}

> **password**: `string`

The password for authentication. Managed by vault; absent on the persisted config.

***

### pollingIntervalMinutes? {#pollingintervalminutes}

> `optional` **pollingIntervalMinutes?**: `number`

How frequently to poll the mailbox in minutes.

#### Default

```ts
2
```

***

### retainMessages? {#retainmessages}

> `optional` **retainMessages?**: `boolean`

Whether to retain messages on the POP3 server after retrieval.

#### Default

```ts
true
```

***

### mutexTimeoutMs? {#mutextimeoutms}

> `optional` **mutexTimeoutMs?**: `number`

Maximum time in milliseconds to wait for the poll mutex before skipping the tick.
When not set, the mutex waits based on the system default.
