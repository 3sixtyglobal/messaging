// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The outcome of creating a mailbox.
 */
export interface IMailboxCreateResult {
	/**
	 * The identifier assigned to the new mailbox.
	 */
	id: string;

	/**
	 * The URL to open for the user when the mailbox cannot be polled until an external
	 * authentication flow has completed, such as an OAuth consent URL. Absent when the supplied
	 * configuration is already sufficient to poll the mailbox.
	 */
	authUrl?: string;
}
