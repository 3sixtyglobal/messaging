// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the SMTP email connector.
 */
export interface ISmtpMessagingEmailConnectorConfig {
	/**
	 * The hostname or IP address of the SMTP server.
	 */
	host: string;

	/**
	 * The port to connect to.
	 * @default 587
	 */
	port?: number;

	/**
	 * Whether to use TLS for the connection.
	 * @default false
	 */
	secure?: boolean;

	/**
	 * The username for authentication.
	 */
	username?: string;

	/**
	 * The password for authentication.
	 */
	password?: string;
}
