// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IStoredEmail } from "../IStoredEmail.js";

/**
 * Response from retrieving a stored email.
 */
export interface IMailStorageGetResponse {
	/**
	 * The retrieved stored email.
	 */
	body: IStoredEmail;
}
