// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPop3EmailConnectorConfig } from "./IPop3EmailConnectorConfig.js";

/**
 * Constructor options for the POP3 email connector.
 */
export interface IPop3EmailConnectorConstructorOptions {
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
	 * The configuration for the POP3 connector.
	 */
	config: IPop3EmailConnectorConfig;
}
