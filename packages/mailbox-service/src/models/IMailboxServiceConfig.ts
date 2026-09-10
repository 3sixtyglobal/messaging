// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the mailbox service.
 */
export interface IMailboxServiceConfig {
	/**
	 * The path an external authentication flow returns to, combined with the public origin of the
	 * request to form the callback URI passed to connectors. It has to be a single path for the
	 * whole deployment because providers only accept callbacks they have been registered with, so
	 * the mailbox is correlated by the state carried through the flow rather than by the URI.
	 * @default "/mailbox/authcallback"
	 */
	authCallbackPath?: string;
}
