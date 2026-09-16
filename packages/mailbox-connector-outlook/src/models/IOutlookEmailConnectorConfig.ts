// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the Outlook email connector.
 */
export interface IOutlookEmailConnectorConfig {
	/**
	 * The address of the mailbox to monitor, for example "user@example.com".
	 * Used as the Microsoft Graph user identifier, and checked against the account which gives
	 * consent so a mailbox can only ever be bound to the address it names.
	 */
	emailAddress: string;

	/**
	 * The directory the app registration lives in, either the tenant identifier or its domain.
	 * Use "common" or "organizations" for a multi-tenant app registration, though the client
	 * credentials flow requires a specific tenant.
	 */
	tenantId: string;

	/**
	 * The application (client) identifier of the Microsoft Entra ID app registration.
	 */
	clientId: string;

	/**
	 * The client secret of the app registration. Stored securely in the vault.
	 * Required unless clientCertificate is supplied.
	 */
	clientSecret?: string;

	/**
	 * The certificate credential of the app registration, as a JSON string carrying the PEM
	 * encoded privateKey and the thumbprintSha256 of the certificate, plus an optional x5c chain.
	 * Stored securely in the vault. When supplied this takes precedence over the client secret.
	 */
	clientCertificate?: string;

	/**
	 * Whether to access the mailbox with application rather than delegated permissions, using the
	 * client credentials flow. Suits a shared or service mailbox, as no user is present to give
	 * consent, and requires the Mail.Read application permission to be granted to the app
	 * registration and ideally scoped to this mailbox by an application access policy.
	 * @default false
	 */
	appOnlyAccess?: boolean;

	/**
	 * The identifiers of the mail folders to monitor for new messages, either well known names
	 * such as "inbox" or folder identifiers. Each folder is tracked with its own delta cursor,
	 * so no folder enumeration is needed to pick up new messages.
	 * @default ["inbox"]
	 */
	folderIds?: string[];

	/**
	 * The maximum number of messages to retrieve during a single poll of the initial sync.
	 * Later polls continue from where the previous one finished.
	 * @default 50
	 */
	maxMessagesPerPoll?: number;

	/**
	 * The number of delivered message identifiers retained in the connector state.
	 * These guard against a message being delivered twice when a poll cycle is replayed.
	 * @default 200
	 */
	maxDeliveredIdHistory?: number;

	/**
	 * How often to poll for new messages, in minutes.
	 * @default 2
	 */
	pollingIntervalMinutes?: number;

	/**
	 * Maximum time in milliseconds to wait for the poll mutex before skipping the tick.
	 * When not set, the mutex waits based on the system default.
	 */
	mutexTimeoutMs?: number;
}
