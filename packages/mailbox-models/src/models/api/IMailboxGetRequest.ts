// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to retrieve a mailbox by ID.
 */
export interface IMailboxGetRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The identifier of the mailbox to retrieve.
		 */
		id: string;
	};
}
