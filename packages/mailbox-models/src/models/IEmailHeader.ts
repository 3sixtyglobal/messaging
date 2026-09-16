// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing a single parsed email header.
 */
export interface IEmailHeader {
	/**
	 * The lowercase header name.
	 */
	key: string;

	/**
	 * The original header name preserving case.
	 */
	originalKey: string;

	/**
	 * The header value.
	 */
	value: string;
}
