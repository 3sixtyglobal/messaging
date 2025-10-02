# Interface: IAwsBaseConfig

Base configuration for the AWS Connector.

## Extended by

- [`IAwsEmailConnectorConfig`](IAwsEmailConnectorConfig.md)
- [`IAwsPushNotificationConnectorConfig`](IAwsPushNotificationConnectorConfig.md)
- [`IAwsSmsConnectorConfig`](IAwsSmsConnectorConfig.md)

## Properties

### region

> **region**: `string`

The region for the AWS instance.

***

### authMode?

> `optional` **authMode**: `"credentials"` \| `"pod"`

The authentication mode.
- "credentials": Use access key ID and secret access key.
- "pod": Use IAM role attached to the pod (e.g., in EKS).

#### Default

```ts
credentials
```

***

### accessKeyId?

> `optional` **accessKeyId**: `string`

The AWS access key ID.

***

### secretAccessKey?

> `optional` **secretAccessKey**: `string`

The AWS secret access key.

***

### endpoint?

> `optional` **endpoint**: `string`

AWS endpoint, not usually required but could be used for local testing.
