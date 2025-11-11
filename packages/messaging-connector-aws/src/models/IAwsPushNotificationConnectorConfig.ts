// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAwsApplicationSettings } from "./IAwsApplicationSettings.js";
import type { IAwsBaseConfig } from "./IAwsBaseConfig.js";

/**
 * Configuration for the AWS Connector.
 */
export interface IAwsPushNotificationConnectorConfig extends IAwsBaseConfig {
	/**
	 * The applications settings for the push notifications.
	 */
	applicationsSettings: IAwsApplicationSettings[];
}
