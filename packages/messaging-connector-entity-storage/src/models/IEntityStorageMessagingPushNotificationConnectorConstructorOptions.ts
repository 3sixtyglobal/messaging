// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the entity storage messaging push notification connector.
 */
export interface IEntityStorageMessagingPushNotificationConnectorConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The type of entity storage connector to use for the push notifications entries.
	 * @default push-notification-device-entry
	 */
	messagingDeviceEntryStorageConnectorType?: string;

	/**
	 * The type of entity storage connector to use for the push notifications entries.
	 * @default push-notification-message-entry
	 */
	messagingMessageEntryStorageConnectorType?: string;
}
