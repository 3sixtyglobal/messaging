// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Runtime state persisted between poll cycles for a POP3 connector.
 */
export interface IPop3EmailConnectorState {
	/**
	 * The set of unique IDs (UIDLs) already retrieved from the server.
	 * Populated via the POP3 UIDL command, which assigns a stable per-message identifier
	 * that remains constant across sessions regardless of message numbering changes.
	 */
	seenUidls?: string[];
}
