// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IGmailEmailConnectorConfig } from "./IGmailEmailConnectorConfig.js";

/**
 * Constructor options for the Gmail email connector.
 */
export interface IGmailEmailConnectorConstructorOptions {
	/**
	 * The component type for the task scheduler used to manage polling intervals.
	 * @default "task-scheduler"
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The component type for logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the Gmail connector.
	 */
	config: IGmailEmailConnectorConfig;
}
