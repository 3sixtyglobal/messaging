// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMailbox } from "../IMailbox.js";

/**
 * Request to create a new mailbox.
 */
export interface IMailboxCreateRequest {
	/**
	 * The mailbox to create.
	 */
	body: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">;
}
