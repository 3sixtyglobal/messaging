# Interface: IImapEmailConnectorConfig

Configuration for the IMAP email connector.

## Properties

### host {#host}

> **host**: `string`

The hostname or IP address of the IMAP server.

***

### port? {#port}

> `optional` **port?**: `number`

The port number to connect to.

#### Default

```ts
993
```

***

### secure? {#secure}

> `optional` **secure?**: `boolean`

Whether to use a direct TLS connection.
Set to false to use a plain connection (STARTTLS may still be negotiated).

#### Default

```ts
true
```

***

### username {#username}

> **username**: `string`

The username to authenticate with.

***

### password {#password}

> **password**: `string`

The password to authenticate with. Stored securely in the vault.

***

### folders? {#folders}

> `optional` **folders?**: `string`[]

The folder paths to poll for new messages.
Nested paths use the server's hierarchy delimiter, e.g. "Work/Projects".

#### Default

```ts
["INBOX"]
```

***

### pollingIntervalMinutes? {#pollingintervalminutes}

> `optional` **pollingIntervalMinutes?**: `number`

How often to poll for new messages, in minutes.

#### Default

```ts
2
```

***

### mutexTimeoutMs? {#mutextimeoutms}

> `optional` **mutexTimeoutMs?**: `number`

Maximum time in milliseconds to wait for the poll mutex before skipping the tick.
When not set, the mutex waits based on the system default.
