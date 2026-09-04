// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Per-folder polling state for the IMAP connector.
 */
export interface IImapEmailConnectorFolderState {
	/**
	 * The UID validity value at the time of the last successful poll,
	 * serialised as a string to survive JSON round-trips.
	 * When this changes the connector resets lastUid to 0.
	 */
	uidValidity?: string;

	/**
	 * The highest UID successfully processed in the last poll cycle.
	 * The next poll fetches UIDs strictly greater than this value.
	 */
	lastUid?: number;
}
