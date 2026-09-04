// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISmtpMessagingEmailConnectorConfig } from "./ISmtpMessagingEmailConnectorConfig.js";

/**
 * Options for the SMTP messaging email connector.
 */
export interface ISmtpMessagingEmailConnectorConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the SMTP connector.
	 */
	config: ISmtpMessagingEmailConnectorConfig;
}
