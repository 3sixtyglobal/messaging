// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Runtime state persisted between poll cycles for an Outlook connector.
 */
export interface IOutlookEmailConnectorState {
	/**
	 * The serialized token cache the consent flow filled, holding the refresh token the connector
	 * exchanges for access tokens. Declared secure in the connector state schema so the owning
	 * component vaults it rather than persisting it here.
	 * Unset until consent has been given, while the connector supplies a consent URL instead of
	 * polling, and never set for a mailbox accessed with application permissions.
	 */
	tokenCache?: string;

	/**
	 * The identifier of the account the consent flow issued the credentials for, used to find it
	 * again in the token cache. Not a credential itself, it is the directory identifier of the
	 * signed in account, and it is recorded because the address on a cached account is only
	 * populated from the identity token the sign in returned.
	 * Unset until consent has been given, and never set for a mailbox accessed with application
	 * permissions.
	 */
	accountId?: string;

	/**
	 * The delta cursors processing has reached, keyed by folder identifier.
	 * Later polls follow them to be handed only the messages which have changed since.
	 */
	deltaLinks?: { [folderId: string]: string };

	/**
	 * The links to the next page of the initial folder sync, keyed by folder identifier.
	 * Only set while initialSyncComplete is false and more pages remain for that folder.
	 */
	syncNextLinks?: { [folderId: string]: string };

	/**
	 * The folders whose existing messages have all been walked during the initial sync.
	 */
	syncCompletedFolderIds?: string[];

	/**
	 * The receipt time a sync which is under way delivers from, held apart from
	 * lastReceivedDateTime so it stays fixed while the walk is spread over several polls.
	 * Only set when a delta cursor expired and the folders have to be walked a second time,
	 * where it keeps mail which was already delivered from being delivered again.
	 */
	syncFromDateTime?: string;

	/**
	 * Whether the initial sync of the existing mailbox contents has finished.
	 * Until it has, polling walks the folders rather than following their delta cursors.
	 */
	initialSyncComplete?: boolean;

	/**
	 * The receipt time of the most recently delivered message.
	 * A delta cursor reports a message again whenever any of its properties change, such as its
	 * read state, so this is what separates a new arrival from a message which was merely touched.
	 */
	lastReceivedDateTime?: string;

	/**
	 * The identifiers of the most recently delivered messages, oldest first.
	 * Microsoft Graph message identifiers are stable for a message in a folder, so this prevents
	 * a message being delivered twice when a poll cycle is replayed after a persistence failure.
	 */
	deliveredMessageIds?: string[];
}
