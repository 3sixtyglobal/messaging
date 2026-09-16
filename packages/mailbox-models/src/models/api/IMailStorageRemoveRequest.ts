// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to remove a stored email.
 */
export interface IMailStorageRemoveRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The identifier of the stored email to remove.
		 */
		id: string;
	};
}
