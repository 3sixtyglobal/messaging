# Interface: IAwsEmailConnectorConfig

Configuration for the AWS Connector.

## Extends

- [`IAwsBaseConfig`](IAwsBaseConfig.md)

## Properties

### region {#region}

> **region**: `string`

The region for the AWS instance.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`region`](IAwsBaseConfig.md#region)

***

### authMode? {#authmode}

> `optional` **authMode**: `"credentials"` \| `"pod"`

The authentication mode.
- "credentials": Use access key ID and secret access key.
- "pod": Use IAM role attached to the pod (e.g., in EKS).

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`authMode`](IAwsBaseConfig.md#authmode)

***

### accessKeyId? {#accesskeyid}

> `optional` **accessKeyId**: `string`

The AWS access key ID.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`accessKeyId`](IAwsBaseConfig.md#accesskeyid)

***

### secretAccessKey? {#secretaccesskey}

> `optional` **secretAccessKey**: `string`

The AWS secret access key.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`secretAccessKey`](IAwsBaseConfig.md#secretaccesskey)

***

### endpoint? {#endpoint}

> `optional` **endpoint**: `string`

AWS endpoint, not usually required but could be used for local testing.

#### Inherited from

[`IAwsBaseConfig`](IAwsBaseConfig.md).[`endpoint`](IAwsBaseConfig.md#endpoint)
