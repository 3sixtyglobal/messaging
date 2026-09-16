# Interface: IGmailEmailConnectorConfig

Configuration for the Gmail email connector.

## Properties

### emailAddress {#emailaddress}

> **emailAddress**: `string`

The address of the mailbox to monitor, for example "user@example.com".
Used as the Gmail API user identifier, and as the impersonated subject
when a service account key is supplied.

***

### clientId? {#clientid}

> `optional` **clientId?**: `string`

The OAuth 2.0 client identifier from the Google Cloud project.
Required unless serviceAccountKey is supplied.

***

### clientSecret? {#clientsecret}

> `optional` **clientSecret?**: `string`

The OAuth 2.0 client secret from the Google Cloud project. Stored securely in the vault.
Required unless serviceAccountKey is supplied.

***

### serviceAccountKey? {#serviceaccountkey}

> `optional` **serviceAccountKey?**: `string`

The JSON service account key used for domain-wide delegation, as a string.
Stored securely in the vault. When supplied this takes precedence over the
authorisation code credentials and the mailbox is accessed by impersonating emailAddress.

***

### labelIds? {#labelids}

> `optional` **labelIds?**: `string`[]

The identifiers of the labels to monitor for new messages.
A message carrying any of them is delivered, so the mailbox sync walks one label at a time
because the Gmail message list requires a message to carry every label it is given.

#### Default

```ts
["INBOX"]
```

***

### maxMessagesPerPoll? {#maxmessagesperpoll}

> `optional` **maxMessagesPerPoll?**: `number`

The maximum number of messages to retrieve during a single poll of the initial sync.
Later polls continue from where the previous one finished.

#### Default

```ts
50
```

***

### maxDeliveredIdHistory? {#maxdeliveredidhistory}

> `optional` **maxDeliveredIdHistory?**: `number`

The number of delivered message identifiers retained in the connector state.
These guard against a message being delivered twice when a poll cycle is replayed.

#### Default

```ts
200
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
