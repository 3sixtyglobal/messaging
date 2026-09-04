// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailbox } from "../IMailbox.js";

/**
 * Request to update an existing mailbox.
 */
export interface IMailboxUpdateRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The identifier of the mailbox to update.
		 */
		id: string;
	};

	/**
	 * The updated mailbox configuration.
	 */
	body: IMailbox;
}
