// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to list mailboxes with optional pagination.
 */
export interface IMailboxListRequest {
	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * The cursor for paginated results.
		 */
		cursor?: string;

		/**
		 * The maximum number of results to return.
		 */
		limit?: string;
	};
}
