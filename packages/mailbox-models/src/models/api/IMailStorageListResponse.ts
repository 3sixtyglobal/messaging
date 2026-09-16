// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IStoredEmail } from "../IStoredEmail.js";

/**
 * Response from querying stored emails.
 */
export interface IMailStorageListResponse {
	/**
	 * The result body.
	 */
	body: {
		/**
		 * The list of stored emails.
		 */
		emails: IStoredEmail[];

		/**
		 * The cursor for the next page of results.
		 */
		cursor?: string;
	};
}
