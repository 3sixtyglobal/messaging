// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IMailbox } from "./IMailbox.js";
import type { IMailboxConfigField } from "./IMailboxConfigField.js";

/**
 * Interface describing the mailbox management component.
 */
export interface IMailboxComponent extends IComponent {
	/**
	 * Add a new mailbox and begin polling for it.
	 * @param mailbox The mailbox configuration to add.
	 * @returns The identifier assigned to the new mailbox.
	 */
	addMailbox(
		mailbox: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
	): Promise<string>;

	/**
	 * Update an existing mailbox.
	 * @param mailbox The updated mailbox configuration.
	 * @returns A promise that resolves when the mailbox has been updated.
	 */
	updateMailbox(mailbox: IMailbox): Promise<void>;

	/**
	 * Remove a mailbox and stop polling for it.
	 * @param id The identifier of the mailbox to remove.
	 * @returns A promise that resolves when the mailbox has been removed.
	 */
	removeMailbox(id: string): Promise<void>;

	/**
	 * Retrieve a mailbox by its identifier.
	 * @param id The identifier of the mailbox to retrieve.
	 * @returns The mailbox.
	 */
	getMailbox(id: string): Promise<IMailbox>;

	/**
	 * List all mailboxes with optional cursor-based pagination.
	 * @param cursor An optional cursor for paginated results.
	 * @param limit An optional maximum number of results to return.
	 * @returns A page of mailboxes and an optional cursor for the next page.
	 */
	listMailboxes(
		cursor?: string,
		limit?: number
	): Promise<{ mailboxes: IMailbox[]; cursor?: string }>;

	/**
	 * Get the configuration schema for a connector type.
	 * @param connectorType The connector type to get the schema for.
	 * @returns The configuration field definitions for the connector.
	 * @throws NotFoundError if no schema is registered for the connector type.
	 */
	getSchema(connectorType: string): Promise<IMailboxConfigField[]>;
}
