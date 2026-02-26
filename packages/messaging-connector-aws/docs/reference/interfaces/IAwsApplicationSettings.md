# Interface: IAwsApplicationSettings

Configuration for the AWS Application Settings.

## Properties

### applicationId

> **applicationId**: `string`

The application identity to send the push notifications.

***

### pushNotificationsPlatformType

> **pushNotificationsPlatformType**: `string`

The type of push notifications platform.

***

### pushNotificationsPlatformCredentials

> **pushNotificationsPlatformCredentials**: `string`

The credentials for the push notifications platform.

***

### pushNotificationsPlatformPrincipal?

> `optional` **pushNotificationsPlatformPrincipal**: `string`

The principal for the push notifications platform (required for APNS and some platform types).
