// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMessagingAdminServiceConfig } from "./IMessagingAdminServiceConfig.js";

/**
 * Options for the messaging admin service.
 */
export interface IMessagingAdminServiceConstructorOptions {
	/**
	 * The type of the entity connector to use.
	 * @default template-entry
	 */
	templateEntryStorageConnectorType?: string;

	/**
	 * The configuration for the messaging admin service.
	 */
	config?: IMessagingAdminServiceConfig;
}
