// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The outcome of updating a mailbox.
 */
export interface IMailboxUpdateResult {
	/**
	 * The URL to open for the user when the updated mailbox cannot be polled until an external
	 * authentication flow has completed, such as an OAuth consent URL. Absent when the updated
	 * configuration is already sufficient to poll the mailbox.
	 */
	authUrl?: string;
}
