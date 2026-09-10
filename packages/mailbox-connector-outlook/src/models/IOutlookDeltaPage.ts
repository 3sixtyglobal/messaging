// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IOutlookDeltaMessage } from "./IOutlookDeltaMessage.js";

/**
 * A page of a Microsoft Graph delta cursor, carrying the link which continues or resumes it.
 */
export interface IOutlookDeltaPage {
	/**
	 * The messages the page reports as added or changed.
	 */
	messages: IOutlookDeltaMessage[];

	/**
	 * The link to the next page, present while more of the current run remains.
	 */
	nextLink?: string;

	/**
	 * The link which resumes the cursor on a later poll, present on the final page of a run.
	 */
	deltaLink?: string;
}
