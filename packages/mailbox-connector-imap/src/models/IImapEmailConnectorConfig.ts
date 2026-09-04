// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the IMAP email connector.
 */
export interface IImapEmailConnectorConfig {
	/**
	 * The hostname or IP address of the IMAP server.
	 */
	host: string;

	/**
	 * The port number to connect to.
	 * @default 993
	 */
	port?: number;

	/**
	 * Whether to use a direct TLS connection.
	 * Set to false to use a plain connection (STARTTLS may still be negotiated).
	 * @default true
	 */
	secure?: boolean;

	/**
	 * The username to authenticate with.
	 */
	username: string;

	/**
	 * The password to authenticate with. Stored securely in the vault.
	 */
	password: string;

	/**
	 * The folder paths to poll for new messages.
	 * Nested paths use the server's hierarchy delimiter, e.g. "Work/Projects".
	 * @default ["INBOX"]
	 */
	folders?: string[];

	/**
	 * How often to poll for new messages, in minutes.
	 * @default 2
	 */
	pollingIntervalMinutes?: number;

	/**
	 * Maximum time in milliseconds to wait for the poll mutex before skipping the tick.
	 * When not set, the mutex waits based on the system default.
	 */
	mutexTimeoutMs?: number;
}
