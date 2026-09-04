// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Constructor options for the mailbox service.
 */
export interface IMailboxServiceConstructorOptions {
	/**
	 * The type of the entity storage connector to use for mailbox entries.
	 * @default mailbox
	 */
	mailboxEntityStorageType?: string;

	/**
	 * The type of the vault connector used to store secure config fields.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The component type for the mail storage component.
	 * @default mail-storage
	 */
	mailStorageComponentType?: string;

	/**
	 * The component type for logging.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The component type for telemetry.
	 * @default telemetry
	 */
	telemetryComponentType?: string;

	/**
	 * The component type for the platform component used to enumerate tenant partitions.
	 * @default platform
	 */
	platformComponentType?: string;
}
