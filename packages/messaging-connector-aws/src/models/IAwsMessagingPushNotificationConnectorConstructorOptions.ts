// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAwsPushNotificationConnectorConfig } from "./IAwsPushNotificationConnectorConfig";

/**
 * Options for the AWS messaging push notification connector.
 */
export interface IAwsMessagingPushNotificationConnectorConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the connector.
	 */
	config: IAwsPushNotificationConnectorConfig;
}
