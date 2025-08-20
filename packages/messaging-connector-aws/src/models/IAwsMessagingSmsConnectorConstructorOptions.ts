// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAwsSmsConnectorConfig } from "./IAwsSmsConnectorConfig";

/**
 * Options for the AWS messaging SMS connector.
 */
export interface IAwsMessagingSmsConnectorConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the connector.
	 */
	config: IAwsSmsConnectorConfig;
}
