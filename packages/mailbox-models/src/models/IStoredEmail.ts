// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEmail } from "./IEmail.js";

/**
 * Interface describing an email message persisted by the mail storage component.
 */
export interface IStoredEmail extends IEmail {
	/**
	 * The storage entity identifier.
	 */
	id: string;

	/**
	 * The identifier of the mailbox that received the message.
	 */
	mailboxId: string;

	/**
	 * The ISO 8601 timestamp when the message was stored.
	 */
	receivedAt: string;
}
