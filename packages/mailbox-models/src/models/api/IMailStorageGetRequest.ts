// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to retrieve a stored email by ID.
 */
export interface IMailStorageGetRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The identifier of the stored email to retrieve.
		 */
		id: string;
	};
}
