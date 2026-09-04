// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailStorageServiceConfig } from "./IMailStorageServiceConfig.js";

/**
 * Constructor options for the mail storage service.
 */
export interface IMailStorageServiceConstructorOptions {
	/**
	 * The type of the entity storage connector to use for email entries.
	 * @default stored-email
	 */
	storedEmailEntityStorageType?: string;

	/**
	 * The component type for the task scheduler used for retention cleanup.
	 * @default task-scheduler
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The component type for logging.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * Optional configuration for the mail storage service.
	 */
	config?: IMailStorageServiceConfig;
}
