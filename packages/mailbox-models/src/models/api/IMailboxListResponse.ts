// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailbox } from "../IMailbox.js";

/**
 * Response from listing mailboxes.
 */
export interface IMailboxListResponse {
	/**
	 * The result body.
	 */
	body: {
		/**
		 * The list of mailboxes.
		 */
		mailboxes: IMailbox[];

		/**
		 * The cursor for the next page of results.
		 */
		cursor?: string;
	};
}
