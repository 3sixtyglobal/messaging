// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for a POP3 protocol connector.
 */
export interface IPop3EmailConnectorConfig {
	/**
	 * The hostname or IP address of the POP3 server.
	 */
	host: string;

	/**
	 * The port number of the POP3 server.
	 * @default 110
	 */
	port?: number;

	/**
	 * Whether to use TLS (port 995) or plaintext (port 110).
	 * @default false
	 */
	secure?: boolean;

	/**
	 * The username for authentication.
	 */
	username: string;

	/**
	 * The password for authentication. Managed by vault; absent on the persisted config.
	 */
	password: string;

	/**
	 * How frequently to poll the mailbox in minutes.
	 * @default 2
	 */
	pollingIntervalMinutes?: number;

	/**
	 * Whether to retain messages on the POP3 server after retrieval.
	 * @default true
	 */
	retainMessages?: boolean;

	/**
	 * Maximum time in milliseconds to wait for the poll mutex before skipping the tick.
	 * When not set, the mutex waits based on the system default.
	 */
	mutexTimeoutMs?: number;
}
