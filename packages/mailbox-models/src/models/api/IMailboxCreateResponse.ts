// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, HttpStatusCode } from "@twin.org/web";

/**
 * Response to creating a new mailbox.
 */
export interface IMailboxCreateResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.created;

	/**
	 * Additional response headers.
	 */
	headers: {
		/**
		 * The location where the mailbox was created.
		 */
		[HeaderTypes.Location]: string;
	};

	/**
	 * The body of the response.
	 */
	body: {
		/**
		 * The URL to open for the user when the mailbox must complete an external authentication
		 * flow, such as an OAuth consent URL, before it can be polled.
		 */
		authUrl?: string;
	};
}
