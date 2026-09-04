// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailbox } from "../IMailbox.js";

/**
 * Response from retrieving a mailbox.
 */
export interface IMailboxGetResponse {
	/**
	 * The retrieved mailbox.
	 */
	body: IMailbox;
}
