// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IImapEmailConnectorFolderState } from "./IImapEmailConnectorFolderState.js";

/**
 * Top-level polling state for the IMAP connector, keyed by folder path.
 */
export interface IImapEmailConnectorState {
	/**
	 * Per-folder state, keyed by the folder path as configured.
	 */
	folders?: { [folderPath: string]: IImapEmailConnectorFolderState };
}
