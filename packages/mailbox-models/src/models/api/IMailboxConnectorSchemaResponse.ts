// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailboxConfigField } from "../IMailboxConfigField.js";

/**
 * Response from retrieving a connector configuration schema.
 */
export interface IMailboxConnectorSchemaResponse {
	/**
	 * The schema fields for the connector.
	 */
	body: IMailboxConfigField[];
}
