// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IOutlookEmailConnectorConfig } from "./IOutlookEmailConnectorConfig.js";

/**
 * Constructor options for the Outlook email connector.
 */
export interface IOutlookEmailConnectorConstructorOptions {
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
	 * The configuration for the Outlook connector.
	 */
	config: IOutlookEmailConnectorConfig;
}
