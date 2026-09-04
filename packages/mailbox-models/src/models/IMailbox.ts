// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";

/**
 * Interface describing a mailbox configuration.
 */
export interface IMailbox<TConfig = unknown, TState = unknown, TAuthState = unknown> {
	/**
	 * The unique identifier for the mailbox.
	 */
	id: string;

	/**
	 * The display name for the mailbox.
	 */
	name: string;

	/**
	 * The connector type identifying which connector handles this mailbox.
	 */
	connectorType: string;

	/**
	 * The connector-owned configuration for this mailbox.
	 */
	config?: TConfig;

	/**
	 * The connector-owned runtime state for this mailbox.
	 */
	state?: TState;

	/**
	 * Whether this mailbox is active and should be polled.
	 */
	enabled: boolean;

	/**
	 * Whether this mailbox is awaiting re-authentication.
	 */
	requiresAuth?: boolean;

	/**
	 * Optional protocol-specific state produced during the auth flow, such as an OAuth URL or code.
	 */
	authState?: TAuthState;

	/**
	 * The last error returned by the authentication callback; cleared on successful authentication.
	 */
	authError?: IError;

	/**
	 * The last error returned by the retrieval callback; cleared on successful retrieval.
	 */
	retrievalError?: IError;
}
