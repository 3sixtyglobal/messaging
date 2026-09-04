// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing an email address with an optional display name.
 */
export interface IEmailAddress {
	/**
	 * The display name for the address.
	 */
	name?: string;

	/**
	 * The email address.
	 */
	address: string;
}
