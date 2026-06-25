// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the messaging service.
 */
export interface IMessagingServiceConstructorOptions {
	/**
	 * The type of the email messaging connector to use, defaults to not configured.
	 */
	messagingEmailConnectorType?: string;

	/**
	 * The type of the push notifications messaging connector to use, defaults to not configured.
	 */
	messagingPushNotificationConnectorType?: string;

	/**
	 * The type of the sms messaging connector to use, defaults to not configured.
	 */
	messagingSmsConnectorType?: string;

	/**
	 * The type of the messaging admin component to use.
	 * @default messaging-admin
	 */
	messagingAdminComponentType?: string;
}
