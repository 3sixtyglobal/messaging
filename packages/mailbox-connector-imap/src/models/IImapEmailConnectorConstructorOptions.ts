// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IImapEmailConnectorConfig } from "./IImapEmailConnectorConfig.js";

/**
 * Constructor options for the IMAP email connector.
 */
export interface IImapEmailConnectorConstructorOptions {
	/**
	 * The configuration for the IMAP connector.
	 */
	config: IImapEmailConnectorConfig;

	/**
	 * The component type for the task scheduler used to manage polling intervals.
	 * @default "task-scheduler"
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The component type for logging.
	 */
	loggingComponentType?: string;
}
