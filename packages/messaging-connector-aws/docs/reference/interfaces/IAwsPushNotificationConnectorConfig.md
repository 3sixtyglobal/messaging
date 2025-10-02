# Interface: IAwsPushNotificationConnectorConfig

Configuration for the AWS Connector.

## Extends

- [`IAwsBaseConfig`](IAwsBaseConfig.md)

## Properties

### region

> **region**: `string`

The region for the AWS instance.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`region`](IAwsBaseConfig.md#region)

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

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`authMode`](IAwsBaseConfig.md#authmode)

***

### accessKeyId?

> `optional` **accessKeyId**: `string`

The AWS access key ID.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`accessKeyId`](IAwsBaseConfig.md#accesskeyid)

***

### secretAccessKey?

> `optional` **secretAccessKey**: `string`

The AWS secret access key.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`secretAccessKey`](IAwsBaseConfig.md#secretaccesskey)

***

### endpoint?

> `optional` **endpoint**: `string`

AWS endpoint, not usually required but could be used for local testing.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`endpoint`](IAwsBaseConfig.md#endpoint)

***

### applicationsSettings

> **applicationsSettings**: [`IAwsApplicationSettings`](IAwsApplicationSettings.md)[]

The applications settings for the push notifications.
