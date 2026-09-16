# Interface: IEmailConsumer

Interface describing a consumer that is notified when new emails are available.

## Extends

- `IComponent`

## Methods

### onNewMessages() {#onnewmessages}

> **onNewMessages**(): `Promise`\<`void`\>

Called when new emails have been stored, prompting the consumer to query for them.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the consumer has processed the notification.
