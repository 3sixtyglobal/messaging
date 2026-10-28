// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMessagingServiceConfig } from "./IMessagingServiceConfig.js";

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

	/**
	 * The type of the logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the messaging service.
	 */
	config?: IMessagingServiceConfig;
}
