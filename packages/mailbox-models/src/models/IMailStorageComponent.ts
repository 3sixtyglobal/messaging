// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IEmail } from "./IEmail.js";
import type { IStoredEmail } from "./IStoredEmail.js";

/**
 * Interface describing the mail storage component for persisting and querying received emails.
 */
export interface IMailStorageComponent extends IComponent {
	/**
	 * Store an email received from a mailbox.
	 * @param mailboxId The identifier of the mailbox that received the email.
	 * @param email The email to store.
	 * @returns The identifier assigned to the stored email.
	 */
	store(mailboxId: string, email: IEmail): Promise<string>;

	/**
	 * Retrieve a stored email by its identifier.
	 * @param id The identifier of the stored email.
	 * @returns The stored email.
	 */
	get(id: string): Promise<IStoredEmail>;

	/**
	 * Remove a stored email by its identifier.
	 * @param id The identifier of the stored email to remove.
	 * @returns A promise that resolves when the email has been removed.
	 */
	remove(id: string): Promise<void>;

	/**
	 * Query stored emails received at or after a given epoch.
	 * @param sinceEpoch The ISO 8601 timestamp to filter emails received at or after.
	 * @param mailboxId An optional mailbox identifier to restrict results to.
	 * @param cursor An optional cursor for paginated results.
	 * @param limit An optional maximum number of results to return.
	 * @returns A page of stored emails and an optional cursor for the next page.
	 */
	query(
		sinceEpoch: string,
		mailboxId?: string,
		cursor?: string,
		limit?: number
	): Promise<{ emails: IStoredEmail[]; cursor?: string }>;
}
