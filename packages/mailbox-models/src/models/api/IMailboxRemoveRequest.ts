// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to remove a mailbox.
 */
export interface IMailboxRemoveRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The identifier of the mailbox to remove.
		 */
		id: string;
	};
}
