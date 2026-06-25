// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the entity storage messaging email connector.
 */
export interface IEntityStorageMessagingEmailConnectorConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The type of entity storage connector to use for the email entries.
	 * @default email-entry
	 */
	messagingEmailEntryStorageConnectorType?: string;
}
