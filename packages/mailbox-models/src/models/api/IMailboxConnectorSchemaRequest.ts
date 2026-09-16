// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to retrieve the configuration schema for a connector.
 */
export interface IMailboxConnectorSchemaRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The connector type identifier.
		 */
		connectorType: string;
	};
}
