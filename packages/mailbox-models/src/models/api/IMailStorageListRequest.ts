// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to query stored emails.
 */
export interface IMailStorageListRequest {
	/**
	 * The query parameters.
	 */
	query: {
		/**
		 * Return only emails received at or after this ISO 8601 timestamp.
		 */
		since: string;

		/**
		 * Filter emails by mailbox identifier.
		 */
		mailboxId?: string;

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
