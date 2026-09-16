// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to complete an authentication flow, sent by the external provider redirecting the
 * browser to the fixed callback route.
 */
export interface IMailboxCompleteAuthRequest {
	/**
	 * The query parameters the provider appends to the callback URI.
	 */
	query: {
		[propertyKey: string]: string;

		/**
		 * The correlating state the connector placed in the external flow.
		 */
		state: string;
	};
}
