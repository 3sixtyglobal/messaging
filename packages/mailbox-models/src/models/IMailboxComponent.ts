// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IMailbox } from "./IMailbox.js";
import type { IMailboxConfigField } from "./IMailboxConfigField.js";
import type { IMailboxCreateResult } from "./IMailboxCreateResult.js";
import type { IMailboxUpdateResult } from "./IMailboxUpdateResult.js";

/**
 * Interface describing the mailbox management component.
 */
export interface IMailboxComponent extends IComponent {
	/**
	 * Create a new mailbox and begin polling for it.
	 * Connectors whose credentials are issued by an external flow are asked to start it here, so
	 * the URL the user has to open is returned to the caller which created the mailbox instead of
	 * only surfacing once the first poll has run.
	 * @param mailbox The mailbox configuration to create.
	 * @returns The identifier assigned to the new mailbox, with the URL to open when the mailbox
	 * must be authenticated before it can be polled.
	 */
	createMailbox(
		mailbox: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
	): Promise<IMailboxCreateResult>;

	/**
	 * Update an existing mailbox.
	 * An update replaces the credentials the mailbox authenticates with, so a connector whose
	 * credentials are issued by an external flow is asked to start a new one, and the URL the
	 * user has to open is returned the same way it is when the mailbox is created.
	 * @param mailbox The updated mailbox configuration.
	 * @returns The URL to open when the mailbox must be authenticated before it can be polled.
	 */
	updateMailbox(mailbox: IMailbox): Promise<IMailboxUpdateResult>;

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
	 * Complete an authentication flow for a mailbox awaiting authentication.
	 * The mailbox is correlated from the payload's state property, which the connector placed in
	 * the external flow when it produced its auth state, and which names the partition as well as
	 * the mailbox. The connector exchanges the payload for its credentials, which are stored on
	 * the mailbox state, and polling restarts.
	 * @param authPayload The data handed to the callback URI, carrying the correlating state.
	 * @returns A promise that resolves when the mailbox has been authenticated.
	 * @throws NotFoundError if the correlated mailbox does not exist.
	 * @throws GeneralError if the mailbox is not awaiting authentication, or its connector has no
	 * authentication flow.
	 */
	completeAuth(authPayload: unknown): Promise<void>;

	/**
	 * Get the configuration schema for a connector type.
	 * @param connectorType The connector type to get the schema for.
	 * @returns The configuration field definitions for the connector.
	 * @throws NotFoundError if no schema is registered for the connector type.
	 */
	getSchema(connectorType: string): Promise<IMailboxConfigField[]>;
}
