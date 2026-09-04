# Interface: ISmtpMessagingEmailConnectorConfig

Configuration for the SMTP email connector.

## Properties

### host {#host}

> **host**: `string`

The hostname or IP address of the SMTP server.

***

### port? {#port}

> `optional` **port?**: `number`

The port to connect to.

#### Default

```ts
587
```

***

### secure? {#secure}

> `optional` **secure?**: `boolean`

Whether to use TLS for the connection.

#### Default

```ts
false
```

***

### username? {#username}

> `optional` **username?**: `string`

The username for authentication.

***

### password? {#password}

> `optional` **password?**: `string`

The password for authentication.
