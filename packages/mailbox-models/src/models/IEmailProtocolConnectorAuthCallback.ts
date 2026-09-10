// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import type { IEmailProtocolConnectorAuthState } from "./IEmailProtocolConnectorAuthState.js";

/**
 * Callback invoked by a protocol connector to report the outcome of an authentication attempt.
 * @param mailboxId The identifier of the mailbox this authentication attempt belongs to.
 * @param updatedState Optional connector state to persist on the mailbox entity, carrying any
 * credentials the flow issued in the properties the connector state schema marks as secure.
 * @param requiresAuth True if authentication failed due to invalid or expired credentials.
 * @param authState Optional state produced during the auth flow, carrying the URL to open.
 * @param authError Optional structured error covering all failure types (auth, connection, timeout, etc.).
 */
export type IEmailProtocolConnectorAuthCallback<
	TAuthState extends IEmailProtocolConnectorAuthState = IEmailProtocolConnectorAuthState
> = (
	mailboxId: string,
	updatedState: unknown | undefined,
	requiresAuth: boolean,
	authState?: TAuthState,
	authError?: IError
) => Promise<void>;
