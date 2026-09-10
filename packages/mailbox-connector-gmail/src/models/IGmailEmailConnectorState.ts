// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Runtime state persisted between poll cycles for a Gmail connector.
 */
export interface IGmailEmailConnectorState {
	/**
	 * The OAuth 2.0 refresh token the consent flow issued for the mailbox, declared secure in the
	 * connector state schema so the owning component vaults it rather than persisting it here.
	 * Unset until consent has been given, while the connector supplies a consent URL instead of
	 * polling, and never set for a mailbox authenticated by a service account key.
	 */
	refreshToken?: string;

	/**
	 * The mailbox history identifier processing has reached.
	 * Later polls ask the Gmail history API for the changes which follow it.
	 */
	historyId?: string;

	/**
	 * The page tokens for the next page of the initial mailbox sync, keyed by label identifier.
	 * Only set while initialSyncComplete is false and more pages remain for that label.
	 */
	syncPageTokens?: { [labelId: string]: string };

	/**
	 * The labels whose existing messages have all been walked during the initial sync.
	 */
	syncCompletedLabelIds?: string[];

	/**
	 * Whether the initial sync of the existing mailbox contents has finished.
	 * Until it has, polling walks the message list rather than the history API.
	 */
	initialSyncComplete?: boolean;

	/**
	 * The identifiers of the most recently delivered messages, oldest first.
	 * Gmail message identifiers are permanent, so this prevents a message being
	 * delivered twice when a poll cycle is replayed after a persistence failure.
	 */
	deliveredMessageIds?: string[];
}
