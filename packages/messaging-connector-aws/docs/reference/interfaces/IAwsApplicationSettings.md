# Interface: IAwsApplicationSettings

Configuration for the AWS Application Settings.

## Properties

### applicationId {#applicationid}

> **applicationId**: `string`

The application identity to send the push notifications.

***

### pushNotificationsPlatformType {#pushnotificationsplatformtype}

> **pushNotificationsPlatformType**: `string`

The type of push notifications platform.

***

### pushNotificationsPlatformCredentials {#pushnotificationsplatformcredentials}

> **pushNotificationsPlatformCredentials**: `string`

The credentials for the push notifications platform.

***

### pushNotificationsPlatformPrincipal? {#pushnotificationsplatformprincipal}

> `optional` **pushNotificationsPlatformPrincipal**: `string`

The principal for the push notifications platform (required for APNS and some platform types).
