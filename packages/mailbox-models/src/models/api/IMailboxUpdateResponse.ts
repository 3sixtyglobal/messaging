// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpStatusCode } from "@twin.org/web";

/**
 * Response to updating a mailbox.
 */
export interface IMailboxUpdateResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.ok;

	/**
	 * The body of the response.
	 */
	body: {
		/**
		 * The URL to open for the user when the updated mailbox must complete an external
		 * authentication flow, such as an OAuth consent URL, before it can be polled.
		 */
		authUrl?: string;
	};
}
