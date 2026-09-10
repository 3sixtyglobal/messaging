// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A message as a Microsoft Graph delta cursor reports it, before its content has been fetched.
 */
export interface IOutlookDeltaMessage {
	/**
	 * The identifier of the message within the mailbox.
	 */
	id: string;

	/**
	 * When the message was received, as an ISO 8601 timestamp.
	 */
	receivedDateTime?: string;

	/**
	 * The Outlook categories on the message, reported as the protocol flags of the email.
	 */
	categories?: string[];
}
